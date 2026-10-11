import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
import { conversationStore } from "$lib/stores";
import type { DBMessage } from "$lib/types/db";
import { focusManager } from "@tanstack/svelte-query";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConversationHarness from "../../tests/ConversationHarness.svelte";
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

const MODEL = { id: "model-1", name: "Test Model", provider: "openai" };

function message(
  id: string,
  role: "user" | "assistant",
  text: string,
  parentId: string | null,
  childIds: string[] = []
): DBMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
    parentId,
    childIds,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    modelId: role === "assistant" ? MODEL.id : null,
    model: role === "assistant" ? MODEL : null
  };
}

/** A conversation whose active branch is user "First question" → assistant "First answer". */
function conversationFixture(): ConversationWithMessageMap {
  const user1 = message("user-1", "user", "First question", null, ["assistant-1"]);
  const assistant1 = message("assistant-1", "assistant", "First answer", "user-1");
  const messages = [user1, assistant1];
  return {
    id: "conversation-1",
    name: "Branching chat",
    agentId: null,
    modelId: MODEL.id,
    currentNode: assistant1.id,
    isImporting: false,
    isPinned: false,
    folderId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    model: MODEL,
    messages,
    messageMap: Object.fromEntries(messages.map((m) => [m.id, m]))
  } as unknown as ConversationWithMessageMap;
}

/** Adds a user/assistant pair as a new branch and makes it the active one. */
function addBranch(
  conversation: ConversationWithMessageMap,
  user: DBMessage,
  assistant: DBMessage
) {
  conversation.messages = [
    ...conversation.messages,
    user,
    assistant
  ] as unknown as typeof conversation.messages;
  conversation.messageMap = {
    ...conversation.messageMap,
    [user.id]: user,
    [assistant.id]: assistant
  };
  conversation.currentNode = assistant.id;
}

/** Text of the messages in the chat list, top to bottom. */
function renderedMessages() {
  return Array.from(document.querySelectorAll(".chat-list .message-content, .chat-list p")).map(
    (el) => el.textContent?.trim()
  );
}

describe("Conversation: editing a message while the reply streams", () => {
  const user = userEvent.setup();
  let conversation: ConversationWithMessageMap;
  let chatRequests: Array<{ body: Record<string, unknown> }>;
  let conversationFetches: number;
  let stream: ReturnType<typeof createUIMessageStream>;

  beforeEach(() => {
    conversation = conversationFixture();
    chatRequests = [];
    conversationFetches = 0;
    stream = createUIMessageStream();

    page.data = {
      conversation,
      keys: {},
      modelGroups: [
        {
          provider: "openai",
          models: [
            {
              ...MODEL,
              reasoningType: "none",
              deprecated: false,
              supportsImages: true,
              supportsVideo: false
            }
          ],
          deprecatedModels: []
        }
      ]
    };
    page.url = new URL("http://localhost/conversations/conversation-1") as typeof page.url;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/chat") {
          chatRequests.push({ body: JSON.parse(String(init?.body)) });
          return stream.response;
        }
        if (url === `/api/conversations/${conversation.id}`) {
          conversationFetches++;
          // The conversation as persisted so far. While a reply streams that
          // is still the previous branch: the edited message and its reply
          // are only saved when the stream finishes. The row itself has
          // moved on (here its updatedAt, as when the reply uses a different
          // model than the conversation did), so the refetch is new data to
          // TanStack Query rather than a structurally equal copy it drops.
          return Response.json({
            ...conversation,
            updatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, conversationFetches))
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      })
    );
  });

  afterEach(() => {
    cleanup();
    conversationStore.set(null);
    vi.unstubAllGlobals();
  });

  /** The query refetches on mount; wait until that data has replaced the page data. */
  async function waitForInitialLoad() {
    await waitFor(() => expect(conversationFetches).toBe(1));
    await waitFor(() => {
      let current: unknown;
      conversationStore.subscribe((value) => (current = value))();
      expect(current).not.toBe(conversation);
    });
    await flush();
  }

  async function editFirstMessageAndStartReply() {
    render(ConversationHarness);

    expect(await screen.findByText("First question")).toBeInTheDocument();
    expect(screen.getByText("First answer")).toBeInTheDocument();
    await waitForInitialLoad();

    const textarea = screen.getByLabelText("Edit message user-1");
    await user.clear(textarea);
    await user.type(textarea, "Edited question");
    await user.click(screen.getByText("Edit user-1"));

    // The edited message replaces the old branch locally and a reply starts.
    await waitFor(() => expect(chatRequests).toHaveLength(1));
    expect(chatRequests[0].body.editedMessageId).toBe("user-1");
    expect(chatRequests[0].body.conversationId).toBe("conversation-1");

    stream.push({ type: "start", messageId: "assistant-2" });
    stream.push({ type: "text-start", id: "t1" });
    stream.push({ type: "text-delta", id: "t1", delta: "Second answer, part one" });
    await flush();

    expect(await screen.findByText("Second answer, part one")).toBeInTheDocument();
    expect(screen.getByText("Edited question")).toBeInTheDocument();
    expect(screen.queryByText("First question")).not.toBeInTheDocument();
    expect(screen.queryByText("First answer")).not.toBeInTheDocument();
  }

  async function returnToTheWindow() {
    // Alt-tabbing away and back: TanStack Query refetches the conversation
    // when the window regains focus.
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await waitFor(() => expect(conversationFetches).toBe(2));
    await flush();
    await flush();
  }

  it("keeps showing the new branch after the window regains focus mid-stream", async () => {
    await editFirstMessageAndStartReply();
    await returnToTheWindow();

    stream.push({ type: "text-delta", id: "t1", delta: " and part two" });
    await flush();

    expect(screen.getByText("Edited question")).toBeInTheDocument();
    expect(screen.getByText("Second answer, part one and part two")).toBeInTheDocument();
    expect(screen.queryByText("First question")).not.toBeInTheDocument();
    expect(screen.queryByText("First answer")).not.toBeInTheDocument();
  });

  it("does not append the streaming reply after the previous branch", async () => {
    await editFirstMessageAndStartReply();
    await returnToTheWindow();

    stream.push({ type: "text-delta", id: "t1", delta: " and part two" });
    await flush();

    expect(renderedMessages()).toEqual(["Edited question", "Second answer, part one and part two"]);
  });

  it("applies the refetched conversation once the reply has finished", async () => {
    await editFirstMessageAndStartReply();
    await returnToTheWindow();

    // The server persists the new branch at the end of the stream, so from
    // then on the refetch returns it as the active branch.
    addBranch(
      conversation,
      message("user-2", "user", "Edited question", null, ["assistant-2"]),
      message("assistant-2", "assistant", "Second answer, done", "user-2")
    );

    stream.push({ type: "text-delta", id: "t1", delta: " and part two" });
    stream.push({ type: "text-end", id: "t1" });
    stream.push({ type: "finish" });
    stream.close();

    await waitFor(() => expect(conversationFetches).toBe(3));
    await waitFor(() => expect(screen.getByText("Second answer, done")).toBeInTheDocument());
    expect(renderedMessages()).toEqual(["Edited question", "Second answer, done"]);
  });

  it("still takes a refetched branch when no reply is in flight", async () => {
    render(ConversationHarness);
    expect(await screen.findByText("First answer")).toBeInTheDocument();
    await waitForInitialLoad();

    // Another sibling branch becomes the active one (e.g. via "Next message").
    addBranch(
      conversation,
      message("user-2", "user", "Other question", null, ["assistant-2"]),
      message("assistant-2", "assistant", "Other answer", "user-2")
    );

    await returnToTheWindow();

    expect(await screen.findByText("Other answer")).toBeInTheDocument();
    expect(screen.queryByText("First answer")).not.toBeInTheDocument();
  });
});
