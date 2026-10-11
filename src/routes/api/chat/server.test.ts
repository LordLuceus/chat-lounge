import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestEvent } from "../../../tests/request-event";

const mocks = vi.hoisted(() => ({
  run: vi.fn<(...args: unknown[]) => Promise<Response>>(async () => new Response("stream")),
  getAgent: vi.fn(),
  updateLastUsed: vi.fn(),
  getApiKeys: vi.fn(),
  getConversation: vi.fn(),
  updateConversation: vi.fn(),
  getModel: vi.fn(),
  getPresignedUrl: vi.fn(async (key: string) => `https://signed/${key}`),
  getUser: vi.fn()
}));

vi.mock("$lib/server/ai-service", () => ({
  default: class {
    constructor(
      public provider: string,
      public apiKey: string
    ) {}
    run = mocks.run;
  }
}));
vi.mock("$lib/server/agents-service", () => ({
  getAgent: mocks.getAgent,
  updateLastUsed: mocks.updateLastUsed
}));
vi.mock("$lib/server/api-keys-service", () => ({ getApiKeys: mocks.getApiKeys }));
vi.mock("$lib/server/conversations-service", () => ({
  getConversation: mocks.getConversation,
  updateConversation: mocks.updateConversation
}));
vi.mock("$lib/server/models-service", () => ({ getModel: mocks.getModel }));
vi.mock("$lib/server/r2-storage", () => ({ getPresignedUrl: mocks.getPresignedUrl }));
vi.mock("$lib/server/users-service", () => ({ getUser: mocks.getUser }));

const { POST } = await import("./+server");

const MODEL = {
  id: "gpt-x",
  name: "GPT X",
  provider: "openai",
  supportsTools: true,
  supportsVideo: false
};

const text = (t: string) => [{ type: "text", text: t }];

function post(body: Record<string, unknown>, userId: string | null = "user_1") {
  return POST(
    requestEvent({
      userId,
      url: "http://localhost/api/chat",
      body: { messages: [{ role: "user", parts: text("hi") }], modelId: MODEL.id, ...body }
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ id: "user_1", username: "alice" });
  mocks.getModel.mockResolvedValue(MODEL);
  mocks.getApiKeys.mockResolvedValue([
    { provider: "openai", key: "sk-openai" },
    { provider: "google", key: "g-key" }
  ]);
  mocks.getConversation.mockResolvedValue({ id: "c1", modelId: MODEL.id });
  mocks.getAgent.mockResolvedValue({ id: "a1", name: "Agent" });
});

describe("POST /api/chat", () => {
  it("requires a signed-in user", async () => {
    await expect(post({}, null)).rejects.toMatchObject({ status: 401 });
  });

  it("rejects unknown users, models, and missing API keys", async () => {
    mocks.getUser.mockResolvedValueOnce(null);
    await expect(post({})).rejects.toMatchObject({
      status: 404,
      body: { message: "User not found" }
    });

    mocks.getModel.mockResolvedValueOnce(null);
    await expect(post({})).rejects.toMatchObject({
      status: 404,
      body: { message: "Model not found" }
    });

    mocks.getApiKeys.mockResolvedValueOnce([{ provider: "anthropic", key: "x" }]);
    await expect(post({})).rejects.toMatchObject({
      status: 404,
      body: { message: "API key not found" }
    });
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("streams a reply with the user's key and the request options", async () => {
    const response = await post({
      conversationId: "c1",
      editedMessageId: "m-old",
      thinking: true,
      storageParts: [{ type: "file", key: "user_1/a.png" }]
    });

    expect(await response.text()).toBe("stream");
    expect(mocks.run).toHaveBeenCalledOnce();
    const [
      messages,
      model,
      userId,
      agent,
      conversationId,
      regenerate,
      messageId,
      thinking,
      storageParts,
      imageGeneration
    ] = mocks.run.mock.calls[0] as unknown[];
    expect(messages).toEqual([{ role: "user", parts: text("hi") }]);
    expect(model).toBe(MODEL);
    expect(userId).toBe("user_1");
    expect(agent).toBeUndefined();
    expect(conversationId).toBe("c1");
    expect(regenerate).toBeUndefined();
    expect(messageId).toBe("m-old");
    expect(thinking).toBe(true);
    expect(storageParts).toEqual([{ type: "file", key: "user_1/a.png" }]);
    // OpenAI can generate images, so the image tool is set up with that key.
    expect(imageGeneration).toMatchObject({
      userId: "user_1",
      apiKey: "sk-openai",
      model: { provider: "openai" }
    });
    expect(mocks.updateConversation).not.toHaveBeenCalled();
  });

  it("records a model change on the conversation and agent usage", async () => {
    mocks.getConversation.mockResolvedValueOnce({ id: "c1", modelId: "other" });
    await post({ conversationId: "c1", agentId: "a1" });
    expect(mocks.updateConversation).toHaveBeenCalledWith("c1", { modelId: MODEL.id }, "user_1");
    expect(mocks.updateLastUsed).toHaveBeenCalledWith("user_1", "a1");
    expect(mocks.run.mock.calls[0][3]).toMatchObject({ id: "a1" });
  });

  it("404s for an unknown agent or conversation", async () => {
    mocks.getAgent.mockResolvedValueOnce(null);
    await expect(post({ agentId: "nope" })).rejects.toMatchObject({ status: 404 });
    mocks.getConversation.mockResolvedValueOnce(null);
    await expect(post({ conversationId: "nope" })).rejects.toMatchObject({ status: 404 });
  });

  it("swaps stored file keys for fresh presigned URLs the user owns", async () => {
    await post({
      messages: [
        {
          role: "user",
          parts: [
            { type: "file", key: "user_1/pic.png", mediaType: "image/png", filename: "pic.png" }
          ]
        }
      ]
    });
    const [messages] = mocks.run.mock.calls[0] as unknown[];
    expect(messages).toEqual([
      {
        role: "user",
        parts: [
          {
            type: "file",
            url: "https://signed/user_1/pic.png",
            mediaType: "image/png",
            filename: "pic.png"
          }
        ]
      }
    ]);
  });

  it("refuses files belonging to another user", async () => {
    await expect(
      post({ messages: [{ role: "user", parts: [{ type: "file", key: "user_2/pic.png" }] }] })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects new video input the model cannot take, and hides older video from it", async () => {
    const video = {
      type: "file",
      url: "https://x/clip.mp4",
      mediaType: "video/mp4",
      filename: "clip.mp4"
    };
    await expect(post({ messages: [{ role: "user", parts: [video] }] })).rejects.toMatchObject({
      status: 400,
      body: { message: "GPT X doesn't accept this video input" }
    });

    await post({
      messages: [
        { role: "user", parts: [video] },
        { role: "assistant", parts: text("ok") },
        { role: "user", parts: text("more") }
      ]
    });
    const [messages] = mocks.run.mock.calls[0] as unknown[];
    expect((messages as { parts: unknown[] }[])[0].parts).toEqual([
      { type: "text", text: "[Video not shown to this model: clip.mp4]" }
    ]);
  });

  it("sends YouTube links only to Google models", async () => {
    const youtube = {
      type: "file",
      url: "https://www.youtube.com/watch?v=abc",
      mediaType: "video/mp4"
    };
    mocks.getModel.mockResolvedValue({ ...MODEL, supportsVideo: true });
    await expect(post({ messages: [{ role: "user", parts: [youtube] }] })).rejects.toMatchObject({
      status: 400
    });

    mocks.getModel.mockResolvedValue({ ...MODEL, provider: "google", supportsVideo: true });
    await post({ messages: [{ role: "user", parts: [youtube] }] });
    const [messages] = mocks.run.mock.calls[0] as unknown[];
    expect((messages as { parts: unknown[] }[])[0].parts).toEqual([youtube]);
  });
});
