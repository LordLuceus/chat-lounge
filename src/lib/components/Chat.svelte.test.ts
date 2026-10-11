import { conversationStore } from "$lib/stores";
import type { DBMessage } from "$lib/types/db";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatHarness from "../../tests/ChatHarness.svelte";
import { createUIMessageStream, flush } from "../../tests/ui-message-stream";

vi.mock("svelte-clerk", async () => ({
  Show: (await import("../../tests/mocks/Show.svelte")).default
}));
vi.mock("svelte-clerk/client", () => ({
  useClerkContext: () => ({ user: { id: "user_1", username: "tester", imageUrl: "" } })
}));
vi.mock("$lib/components/EditMessage.svelte", async () => ({
  default: (await import("../../tests/mocks/EditMessageStub.svelte")).default
}));

const { page } = await import("$app/state");
const { goto } = await import("$app/navigation");

function message(
  id: string,
  role: "user" | "assistant",
  text: string,
  parentId: string | null
): DBMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
    parentId,
    childIds: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

describe("Chat", () => {
  const user = userEvent.setup();
  let stream: ReturnType<typeof createUIMessageStream>;
  let requests: Array<{ url: string; body: Record<string, unknown> }>;

  beforeEach(() => {
    stream = createUIMessageStream();
    requests = [];
    page.data = { keys: {} };
    page.url = new URL("http://localhost/") as typeof page.url;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : {} });
        if (url === "/api/chat") return stream.response;
        if (url === "/api/conversations") return Response.json({ id: "new-conversation" });
        throw new Error(`Unexpected fetch: ${url}`);
      })
    );
  });

  afterEach(() => {
    cleanup();
    conversationStore.set(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const chatInput = () => document.querySelector("form textarea") as HTMLTextAreaElement;

  async function sendMessage(text: string) {
    await user.type(chatInput(), text);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests.some((r) => r.url === "/api/chat")).toBe(true));
  }

  async function streamReply(text: string) {
    stream.push({ type: "start", messageId: "reply-1" });
    stream.push({ type: "text-start", id: "t1" });
    stream.push({ type: "text-delta", id: "t1", delta: text });
    await flush();
  }

  async function finishReply() {
    stream.push({ type: "text-end", id: "t1" });
    stream.push({ type: "finish" });
    stream.close();
    await flush();
  }

  it("sends the draft with the selected model and shows the streamed reply", async () => {
    render(ChatHarness, { agent: { id: "agent-1", name: "Helper" } });

    await sendMessage("Hello there");

    const request = requests.find((r) => r.url === "/api/chat")!;
    expect(request.body).toMatchObject({ modelId: "model-1", agentId: "agent-1", thinking: false });
    expect(request.body.conversationId).toBeUndefined();
    const sent = request.body.messages as Array<{ role: string; parts: Array<{ text: string }> }>;
    expect(sent.at(-1)).toMatchObject({
      role: "user",
      parts: [{ type: "text", text: "Hello there" }]
    });
    expect(chatInput().value).toBe("");
    expect(screen.getByText("Hello there")).toBeInTheDocument();

    await streamReply("Hi! How can I help?");
    expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop generating" })).toBeInTheDocument();

    await finishReply();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Stop generating" })).not.toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeInTheDocument();
  });

  it("creates a conversation after the first reply and navigates to it", async () => {
    render(ChatHarness);
    await sendMessage("First message");
    await streamReply("Reply");
    await finishReply();

    await waitFor(() => expect(requests.some((r) => r.url === "/api/conversations")).toBe(true));
    const create = requests.find((r) => r.url === "/api/conversations")!;
    expect(create.body).toMatchObject({ modelId: "model-1" });
    const messages = create.body.messages as Array<{ role: string }>;
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    await waitFor(() =>
      expect(goto).toHaveBeenCalledWith("/conversations/new-conversation", expect.anything())
    );
  });

  it("continues an existing conversation without creating a new one", async () => {
    conversationStore.set({ id: "conversation-1", messages: [] } as never);
    render(ChatHarness, { initialMessages: [message("u1", "user", "Earlier", null)] });

    await sendMessage("Next question");
    expect(requests.find((r) => r.url === "/api/chat")!.body.conversationId).toBe("conversation-1");
    const sent = requests.find((r) => r.url === "/api/chat")!.body.messages as Array<{
      id: string;
    }>;
    expect(sent.map((m) => m.id)[0]).toBe("u1");

    await streamReply("Answer");
    await finishReply();
    await flush();
    expect(requests.some((r) => r.url === "/api/conversations")).toBe(false);
  });

  it("shows an error state with a retry button when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 }))
    );
    render(ChatHarness);
    await user.type(chatInput(), "Hello");
    await user.keyboard("{Enter}");

    expect(await screen.findByText(/There was an error/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("paginates long conversations twenty messages at a time", async () => {
    const initialMessages = Array.from({ length: 45 }, (_, i) =>
      message(`m${i}`, i % 2 ? "assistant" : "user", `Message ${i}`, i ? `m${i - 1}` : null)
    );
    render(ChatHarness, { initialMessages });

    expect(screen.queryByText("Message 0")).not.toBeInTheDocument();
    expect(screen.getByText("Message 25")).toBeInTheDocument();
    expect(screen.getByText("Message 44")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load previous messages" }));
    expect(screen.getByText("Message 5")).toBeInTheDocument();
    expect(screen.queryByText("Message 4")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load all messages" }));
    expect(screen.getByText("Message 0")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load all messages" })).not.toBeInTheDocument();
  });
});
