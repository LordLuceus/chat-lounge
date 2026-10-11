import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestEvent } from "../../../tests/request-event";

const service = vi.hoisted(() => ({
  getConversation: vi.fn(),
  updateConversation: vi.fn(),
  deleteConversation: vi.fn(),
  rewindConversation: vi.fn(),
  getConversationMessage: vi.fn(),
  updateConversationMessage: vi.fn(),
  shareConversation: vi.fn(),
  getSharedConversation: vi.fn(),
  createConversation: vi.fn(),
  getConversations: vi.fn()
}));
vi.mock("$lib/server/conversations-service", () => service);

const byId = await import("./[id]/+server");
const rewind = await import("./[id]/rewind/+server");
const messages = await import("./[id]/messages/[messageId]/+server");
const share = await import("./[id]/share/+server");
const togglePin = await import("./[id]/toggle-pin/+server");
const list = await import("./+server");

beforeEach(() => vi.clearAllMocks());

describe("/api/conversations/[id]", () => {
  it("requires authentication on every method", async () => {
    const event = requestEvent({ userId: null, params: { id: "c1" } });
    await expect(byId.GET(event)).rejects.toMatchObject({ status: 401 });
    await expect(byId.PUT(event)).rejects.toMatchObject({ status: 401 });
    await expect(byId.DELETE(event)).rejects.toMatchObject({ status: 401 });
    expect(service.getConversation).not.toHaveBeenCalled();
  });

  it("reads, updates and deletes through the service as the signed-in user", async () => {
    service.getConversation.mockResolvedValue({ id: "c1" });
    service.updateConversation.mockResolvedValue({ id: "c1", name: "New" });
    service.deleteConversation.mockResolvedValue({ id: "c1", deleted: true });

    expect(await (await byId.GET(requestEvent({ params: { id: "c1" } }))).json()).toEqual({
      id: "c1"
    });
    expect(service.getConversation).toHaveBeenCalledWith("user_1", "c1");

    const put = await byId.PUT(
      requestEvent({
        params: { id: "c1" },
        method: "PUT",
        body: { name: "New", currentNode: "m2" }
      })
    );
    expect(await put.json()).toEqual({ id: "c1", name: "New" });
    expect(service.updateConversation).toHaveBeenCalledWith(
      "c1",
      { currentNode: "m2", name: "New" },
      "user_1"
    );

    const del = await byId.DELETE(requestEvent({ params: { id: "c1" }, method: "DELETE" }));
    expect(await del.json()).toEqual({ id: "c1", deleted: true });
    expect(service.deleteConversation).toHaveBeenCalledWith("user_1", "c1");
  });
});

describe("/api/conversations/[id]/rewind", () => {
  it("validates input and rewinds", async () => {
    await expect(
      rewind.POST(requestEvent({ userId: null, params: { id: "c1" }, body: { messageId: "m" } }))
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      rewind.POST(requestEvent({ params: { id: "c1" }, body: {} }))
    ).rejects.toMatchObject({
      status: 400
    });

    const response = await rewind.POST(
      requestEvent({ params: { id: "c1" }, body: { messageId: "m1" } })
    );
    expect(response.status).toBe(200);
    expect(service.rewindConversation).toHaveBeenCalledWith("c1", "user_1", "m1");
  });
});

describe("/api/conversations/[id]/messages/[messageId]", () => {
  it("returns a message or 404", async () => {
    service.getConversationMessage.mockResolvedValueOnce({ id: "m1" });
    const found = await messages.GET(requestEvent({ params: { id: "c1", messageId: "m1" } }));
    expect(await found.json()).toEqual({ id: "m1" });

    service.getConversationMessage.mockResolvedValueOnce(null);
    await expect(
      messages.GET(requestEvent({ params: { id: "c1", messageId: "m1" } }))
    ).rejects.toMatchObject({
      status: 404
    });
  });

  it("updates message parts and rejects empty updates", async () => {
    await expect(
      messages.PUT(requestEvent({ params: { id: "c1", messageId: "m1" }, method: "PUT", body: {} }))
    ).rejects.toMatchObject({ status: 400 });

    const parts = [{ type: "text", text: "fixed" }];
    const response = await messages.PUT(
      requestEvent({ params: { id: "c1", messageId: "m1" }, method: "PUT", body: { parts } })
    );
    expect(response.status).toBe(200);
    expect(service.updateConversationMessage).toHaveBeenCalledWith("c1", "m1", { parts });
  });
});

describe("/api/conversations/[id]/share", () => {
  it("shares and returns the shared id", async () => {
    service.shareConversation.mockResolvedValueOnce("shared-1");
    const response = await share.POST(requestEvent({ params: { id: "c1" }, method: "POST" }));
    expect(await response.json()).toEqual({ id: "shared-1" });
    expect(service.shareConversation).toHaveBeenCalledWith("c1", "user_1");
  });

  it("serves a shared conversation publicly", async () => {
    service.getSharedConversation.mockResolvedValueOnce({ id: "shared-1", sharedMessages: [] });
    const response = await share.GET(requestEvent({ userId: null, params: { id: "shared-1" } }));
    expect(await response.json()).toEqual({ id: "shared-1", sharedMessages: [] });
  });
});

describe("/api/conversations/[id]/toggle-pin", () => {
  it("flips the pinned flag", async () => {
    service.getConversation.mockResolvedValueOnce({ id: "c1", isPinned: false });
    await togglePin.PUT(requestEvent({ params: { id: "c1" }, method: "PUT" }));
    expect(service.updateConversation).toHaveBeenCalledWith("c1", { isPinned: true }, "user_1");
  });
});

describe("/api/conversations", () => {
  it("pages, sorts and searches the user's conversations", async () => {
    service.getConversations.mockResolvedValueOnce({ conversations: [{ id: "c1" }], total: 45 });
    const response = await list.GET(
      requestEvent({
        url: "http://localhost/api/conversations?page=2&limit=20&search=hello&sortBy=name&sortOrder=asc&folderId=f1"
      })
    );
    expect(await response.json()).toEqual({
      data: [{ id: "c1" }],
      meta: { page: 2, pageSize: 20, total: 45, totalPages: 3 }
    });
    expect(service.getConversations).toHaveBeenCalledWith(
      "user_1",
      20,
      20,
      "name",
      "ASC",
      "hello",
      "f1",
      false
    );
  });

  it("creates a conversation for the signed-in user", async () => {
    service.createConversation.mockResolvedValueOnce({ id: "new" });
    const response = await list.POST(
      requestEvent({ body: { agentId: null, modelId: "m", messages: [], userId: "spoofed" } })
    );
    expect(response.status).toBe(201);
    expect(service.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_1", modelId: "m" })
    );
  });
});
