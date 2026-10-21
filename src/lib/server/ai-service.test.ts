import type { AgentWithUsage } from "$lib/server/agents-service";
import type { DBMessage } from "$lib/types/db";
import type { Model } from "@prisma/client";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
  isWithinTokenLimit: vi.fn(() => true),
  getUser: vi.fn(),
  getAgentByName: vi.fn(async () => null),
  addConversationMessage: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  getConversationMessage: vi.fn(),
  getLastSummary: vi.fn(async (): Promise<unknown> => null),
  isChessEngineAvailable: vi.fn(() => false)
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: mocks.streamText,
    generateText: mocks.generateText,
    convertToModelMessages: vi.fn(async (messages: UIMessage[]) => messages)
  };
});
vi.mock("gpt-tokenizer/model/gpt-4", () => ({ isWithinTokenLimit: mocks.isWithinTokenLimit }));
vi.mock("$lib/server/users-service", () => ({ getUser: mocks.getUser }));
vi.mock("$lib/server/agents-service", () => ({ getAgentByName: mocks.getAgentByName }));
vi.mock("$lib/server/conversations-service", () => ({
  addConversationMessage: mocks.addConversationMessage,
  getConversationMessage: mocks.getConversationMessage,
  getLastSummary: mocks.getLastSummary
}));
vi.mock("$lib/server/r2-storage", () => ({ uploadGeneratedImageToR2: vi.fn() }));
vi.mock("$lib/server/chess/engine-pool", () => ({
  isChessEngineAvailable: mocks.isChessEngineAvailable,
  getEnginePool: vi.fn(() => null)
}));

const { default: AIService } = await import("./ai-service");

const MODEL = {
  id: "claude-test",
  name: "Claude Test",
  provider: "anthropic",
  tokenLimit: 1000,
  reasoningType: "hybrid",
  supportsTools: true,
  supportsImages: true,
  supportsVideo: false,
  deprecated: false,
  adaptiveThinking: true,
  reviewStatus: "approved",
  releaseDate: null,
  createdAt: new Date(),
  updatedAt: new Date()
} as Model;

const user = (id: string, role: "user" | "assistant", text: string): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }]
});

/** What streamText was last called with, and the response hook the service installed. */
function lastCall() {
  const options = mocks.streamText.mock.calls.at(-1)![0];
  const response = mocks.streamText.mock.results.at(-1)!.value;
  const finish = response.toUIMessageStreamResponse.mock.calls.at(-1)![0];
  return { options, finish };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isWithinTokenLimit.mockReturnValue(true);
  mocks.getLastSummary.mockResolvedValue(null);
  mocks.isChessEngineAvailable.mockReturnValue(false);
  mocks.getUser.mockResolvedValue({
    id: "user_1",
    username: "alice",
    useBaseInstructions: true,
    customBaseInstructions: null
  });
  mocks.streamText.mockImplementation(() => ({
    toUIMessageStreamResponse: vi.fn(() => new Response("stream"))
  }));
});

describe("AIService.run", () => {
  it("streams with the base instructions, tool guidelines and metadata as the system prompt", async () => {
    const service = new AIService("anthropic" as never, "key");
    const response = await service.run([user("u1", "user", "Hi")], MODEL, "user_1");

    expect(await response.text()).toBe("stream");
    const { options } = lastCall();
    expect(options.system).toContain("<tool_use_guidelines>");
    expect(options.system).toContain("User: alice");
    expect(options.system).toMatch(/Current Date: \d{4}-\d{2}-\d{2}/);
    expect(options.system).not.toContain("<special_instructions>");
    expect(Object.keys(options.tools).sort()).toEqual(["currentTime", "fetchWebpage", "webSearch"]);
    expect(options.messages).toEqual([user("u1", "user", "Hi")]);
    expect(options.temperature).toBeUndefined();
  });

  it("wraps agent instructions and omits tools for models without tool support", async () => {
    const agent = {
      id: "a1",
      name: "Helper",
      type: "default",
      instructions: "Always rhyme."
    } as AgentWithUsage;
    await new AIService("anthropic" as never, "key").run(
      [user("u1", "user", "Hi")],
      { ...MODEL, supportsTools: false },
      "user_1",
      agent
    );
    const { options } = lastCall();
    expect(options.system).toContain(
      "<special_instructions>\n\nAlways rhyme.\n\n</special_instructions>"
    );
    expect(options.tools).toBeUndefined();
    expect(options.stopWhen).toBeUndefined();
  });

  it("builds a character prompt with the agent's verbosity and the user's name", async () => {
    const agent = {
      id: "a1",
      name: "Captain",
      type: "character",
      verbosity: "concise",
      instructions: "A sea captain."
    } as AgentWithUsage;
    await new AIService("anthropic" as never, "key").run(
      [user("u1", "user", "Hi")],
      MODEL,
      "user_1",
      agent
    );
    const { options } = lastCall();
    expect(options.system).toContain("A sea captain.");
    expect(options.system).toContain("Captain");
    expect(options.system).toContain("Alice");
    expect(options.system).toContain("Keep responses concise");
    expect(options.system).toContain("allow Alice to respond to Captain's actions");
    expect(options.system).not.toContain("{{char}}");
    expect(options.system).not.toContain("{{user}}");
  });

  it("uses the user's own base instructions when set, or none when disabled", async () => {
    mocks.getUser.mockResolvedValue({
      id: "user_1",
      username: "alice",
      useBaseInstructions: true,
      customBaseInstructions: "Talk like a pirate."
    });
    await new AIService("openai" as never, "key").run([user("u1", "user", "Hi")], MODEL, "user_1");
    expect(lastCall().options.system.startsWith("Talk like a pirate.")).toBe(true);

    mocks.getUser.mockResolvedValue({
      id: "user_1",
      username: "alice",
      useBaseInstructions: false
    });
    await new AIService("openai" as never, "key").run([user("u1", "user", "Hi")], MODEL, "user_1");
    expect(lastCall().options.system.startsWith("<tool_use_guidelines>")).toBe(true);
  });

  it("offers the image tool and its guidelines when an image model is available", async () => {
    await new AIService("openai" as never, "key").run(
      [user("u1", "user", "Hi")],
      MODEL,
      "user_1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        userId: "user_1",
        apiKey: "k",
        model: { provider: "openai", id: "gpt-image-2", name: "GPT Image 2" } as never
      }
    );
    const { options } = lastCall();
    expect(Object.keys(options.tools)).toContain("generateImage");
    expect(options.system).toContain("generateImage");
    expect(options.system.indexOf("generateImage")).toBeLessThan(
      options.system.indexOf("</tool_use_guidelines>")
    );
  });

  it("offers the chess tools and their guidelines when an engine is configured", async () => {
    mocks.isChessEngineAvailable.mockReturnValue(true);
    await new AIService("openai" as never, "key").run([user("u1", "user", "Hi")], MODEL, "user_1");
    const { options } = lastCall();
    expect(Object.keys(options.tools)).toEqual(
      expect.arrayContaining(["analyzePosition", "analyzeGame", "makeMoves"])
    );
    expect(options.system).toContain("## Chess Analysis");
    expect(options.system).not.toContain("## Image Generation");
    expect(options.system.indexOf("## Chess Analysis")).toBeLessThan(
      options.system.indexOf("</tool_use_guidelines>")
    );
  });

  it("maps the thinking flag to each provider's options", async () => {
    const service = new AIService("anthropic" as never, "key");
    await service.run(
      [user("u1", "user", "Hi")],
      MODEL,
      "user_1",
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    expect(lastCall().options.providerOptions.anthropic).toEqual({
      thinking: { type: "adaptive", display: "summarized" },
      effort: "high"
    });
    expect(lastCall().options.providerOptions.openrouter.reasoning.enabled).toBe(true);

    await service.run(
      [user("u1", "user", "Hi")],
      { ...MODEL, adaptiveThinking: false },
      "user_1",
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    expect(lastCall().options.providerOptions.anthropic.thinking).toEqual({
      type: "enabled",
      budgetTokens: 4096
    });

    await service.run(
      [user("u1", "user", "Hi")],
      MODEL,
      "user_1",
      undefined,
      undefined,
      undefined,
      undefined,
      false
    );
    expect(lastCall().options.providerOptions.anthropic.thinking).toEqual({ type: "disabled" });
    expect(lastCall().options.providerOptions.openrouter.reasoning.enabled).toBe(false);
  });

  it("rejects unknown providers", () => {
    expect(() => new AIService("fax" as never, "key")).toThrow(/Unsupported AI provider/);
  });
});

describe("AIService.run persistence", () => {
  const messages = [
    user("u1", "user", "Q1"),
    user("a1", "assistant", "A1"),
    user("u2", "user", "Q2")
  ];
  const reply = { id: "a2", role: "assistant", parts: [{ type: "text", text: "A2" }] } as UIMessage;

  it("saves the user message, as a branch when editing, then the reply", async () => {
    await new AIService("anthropic" as never, "key").run(
      messages,
      MODEL,
      "user_1",
      undefined,
      "c1",
      undefined,
      "u-old"
    );
    await lastCall().finish.onFinish({ responseMessage: reply });

    expect(mocks.addConversationMessage).toHaveBeenNthCalledWith(
      1,
      "c1",
      messages[2].parts,
      "user",
      "user_1",
      "u-old"
    );
    expect(mocks.addConversationMessage).toHaveBeenNthCalledWith(
      2,
      "c1",
      reply.parts,
      "assistant",
      undefined,
      undefined,
      false,
      undefined,
      MODEL.id
    );
  });

  it("only saves the reply when regenerating", async () => {
    await new AIService("anthropic" as never, "key").run(
      messages,
      MODEL,
      "user_1",
      undefined,
      "c1",
      true
    );
    await lastCall().finish.onFinish({ responseMessage: reply });
    expect(mocks.addConversationMessage).toHaveBeenCalledOnce();
    expect(mocks.addConversationMessage.mock.calls[0]).toEqual([
      "c1",
      reply.parts,
      "assistant",
      undefined,
      undefined,
      false,
      true,
      MODEL.id
    ]);
  });

  it("stores uploaded files by their R2 key rather than the presigned URL", async () => {
    const withFile: UIMessage[] = [
      {
        id: "u1",
        role: "user",
        parts: [
          { type: "text", text: "look" },
          {
            type: "file",
            url: "https://signed/user_1/cat.png?sig=1",
            mediaType: "image/png",
            filename: "cat.png"
          }
        ]
      }
    ];
    const storageParts = [
      { type: "file" as const, key: "user_1/cat.png", mediaType: "image/png", filename: "cat.png" }
    ];
    await new AIService("anthropic" as never, "key").run(
      withFile,
      MODEL,
      "user_1",
      undefined,
      "c1",
      undefined,
      undefined,
      undefined,
      storageParts
    );
    await lastCall().finish.onFinish({ responseMessage: reply });
    expect(mocks.addConversationMessage.mock.calls[0][1]).toEqual([
      { type: "text", text: "look" },
      storageParts[0]
    ]);
  });

  it("persists nothing without a conversation", async () => {
    await new AIService("anthropic" as never, "key").run(messages, MODEL, "user_1");
    await lastCall().finish.onFinish({ responseMessage: reply });
    expect(mocks.addConversationMessage).not.toHaveBeenCalled();
  });

  it("summarises the conversation after a reply when it outgrows the token limit", async () => {
    mocks.isWithinTokenLimit.mockReturnValueOnce(true).mockReturnValueOnce(false);
    mocks.generateText.mockResolvedValueOnce({ text: "They talked about Q1 and Q2." });
    await new AIService("anthropic" as never, "key").run(
      messages,
      MODEL,
      "user_1",
      undefined,
      "c1"
    );
    await lastCall().finish.onFinish({ responseMessage: reply });
    await vi.waitFor(() => expect(mocks.addConversationMessage).toHaveBeenCalledTimes(3));
    expect(mocks.addConversationMessage.mock.calls[2]).toEqual([
      "c1",
      [{ type: "text", text: "They talked about Q1 and Q2." }],
      "user",
      "user_1",
      undefined,
      true
    ]);
  });
});

describe("AIService context trimming", () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    user(`m${i}`, i % 2 ? "assistant" : "user", `msg ${i}`)
  );

  it("sends everything while it fits", async () => {
    await new AIService("anthropic" as never, "key").run(many, MODEL, "user_1", undefined, "c1");
    expect(lastCall().options.messages).toHaveLength(30);
    expect(mocks.getLastSummary).not.toHaveBeenCalled();
  });

  it("sends everything when over the limit but no summary exists yet", async () => {
    mocks.isWithinTokenLimit.mockReturnValue(false);
    await new AIService("anthropic" as never, "key").run(many, MODEL, "user_1", undefined, "c1");
    expect(lastCall().options.messages).toHaveLength(30);
  });

  it("replaces older messages with the summary and keeps recent context", async () => {
    // Over the limit on the full history, within it once trimmed.
    mocks.isWithinTokenLimit.mockReturnValueOnce(false).mockReturnValue(true);
    mocks.getLastSummary.mockResolvedValue({
      id: "s1",
      role: "user",
      parts: [{ type: "text", text: "Summary of the start" }],
      parentId: null
    });
    await new AIService("anthropic" as never, "key").run(many, MODEL, "user_1", undefined, "c1");
    const sent = lastCall().options.messages as UIMessage[];
    expect(sent[0].id).toBe("s1");
    // Up to 20 messages before the summary point, then the rest.
    expect(sent).toHaveLength(1 + 20 + 1);
    expect(sent.at(-1)!.id).toBe("m29");
  });

  it("falls back to the summary and the latest message when nothing fits", async () => {
    mocks.isWithinTokenLimit.mockReturnValue(false);
    mocks.getLastSummary.mockResolvedValue({
      id: "s1",
      role: "user",
      parts: [{ type: "text", text: "Summary" }],
      parentId: null
    });
    await new AIService("anthropic" as never, "key").run(many, MODEL, "user_1", undefined, "c1");
    const sent = lastCall().options.messages as UIMessage[];
    expect(sent.map((m) => m.id)).toEqual(["s1", "m29"]);
  });
});

describe("AIService helpers", () => {
  it("cleans up generated titles", async () => {
    mocks.generateText.mockResolvedValueOnce({ text: ' "**Trip to Rome**" \n' });
    const title = await new AIService("openai" as never, "key").generateConversationName(
      [user("u1", "user", "Plan my trip")],
      "gpt-5-mini",
      "user_1"
    );
    expect(title).toBe("Trip to Rome");
    expect(mocks.generateText.mock.calls[0][0].messages[0].content).toContain("user: Plan my trip");
  });

  it("names empty conversations without calling the model", async () => {
    expect(
      await new AIService("openai" as never, "key").generateConversationName([], "m", "user_1")
    ).toBe("New Chat");
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it("parses follow-up suggestions from a numbered list", async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: '1. "What about Florence?"\n2. How long is the flight?\n\n3. “Book it.”\n4. extra'
    });
    const followups = await new AIService("openai" as never, "key").generateFollowUps(
      [user("u1", "user", "Rome?") as DBMessage],
      "gpt-5-mini"
    );
    expect(followups).toEqual(["What about Florence?", "How long is the flight?", "Book it."]);
  });
});
