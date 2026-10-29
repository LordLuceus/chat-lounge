import { getConversationMessages } from "$lib/helpers/conversation-helpers";
import type { AIProvider, DBMessage } from "$lib/types/db";
import type { UIDataTypes, UIMessagePart, UITools } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePrisma, type FakePrisma } from "../../tests/fake-prisma";

const prisma = vi.hoisted(() => ({ current: null as unknown as FakePrisma }));
const r2 = vi.hoisted(() => ({
  bulkDeleteFilesFromR2: vi.fn(async (keys: string[]) => keys.length)
}));
const naming = vi.hoisted(() => ({
  generateConversationName: vi.fn(async () => "Generated Title")
}));

vi.mock("$lib/server/db", () => ({
  get prisma() {
    return prisma.current;
  }
}));
vi.mock("$lib/server/r2-storage", () => r2);
vi.mock("$lib/server/ai-service", () => ({
  default: class {
    generateConversationName = naming.generateConversationName;
  }
}));
vi.mock("./folders-service", () => ({
  getFolder: vi.fn(async (userId: string, folderId: string) =>
    folderId === "folder-1" ? { id: folderId, userId, name: "Folder" } : null
  )
}));

const {
  addConversationMessage,
  bulkDeleteConversations,
  createConversation,
  deleteConversation,
  getConversation,
  getLastSummary,
  importChat,
  rewindConversation,
  shareConversation,
  updateConversation,
  updateConversationMessage,
  addToFolder
} = await import("./conversations-service");
const { saveApiKey } = await import("./api-keys-service");

const USER = "user_1";
const OTHER_USER = "user_2";
const MODEL = { id: "gpt-test", name: "GPT Test", provider: "openai", tokenLimit: 128000 };

function text(content: string): UIMessagePart<UIDataTypes, UITools>[] {
  return [{ type: "text", text: content }];
}

/** The text of each message on the active branch, in order. */
async function activeBranch(conversationId: string) {
  const conversation = await getConversation(USER, conversationId);
  return getConversationMessages(conversation).map((m) =>
    m.parts[0] && "text" in m.parts[0] ? m.parts[0].text : ""
  );
}

async function newConversation(name = "Chat") {
  const conversation = await prisma.current.conversation.create({
    data: { name, modelId: MODEL.id, conversationUsers: { create: { userId: USER } } }
  });
  return conversation.id as string;
}

/** A conversation with one exchange: user "Q1" → assistant "A1". */
async function conversationWithExchange() {
  const id = await newConversation();
  await addConversationMessage(id, text("Q1"), "user", USER);
  await addConversationMessage(
    id,
    text("A1"),
    "assistant",
    undefined,
    undefined,
    false,
    false,
    MODEL.id
  );
  return id;
}

beforeEach(() => {
  prisma.current = createFakePrisma({
    models: [MODEL],
    users: [
      { id: USER, username: "alice" },
      { id: OTHER_USER, username: "bob" }
    ]
  });
  r2.bulkDeleteFilesFromR2.mockClear();
  naming.generateConversationName.mockClear();
});

/** Titles are generated with the user's key for the model's provider. */
async function giveApiKey(userId = USER) {
  await saveApiKey(`key-${userId}`, userId, MODEL.provider as AIProvider);
}

describe("addConversationMessage", () => {
  it("chains a user message and its reply from the current node", async () => {
    const id = await newConversation();
    await addConversationMessage(id, text("Q1"), "user", USER);
    await addConversationMessage(
      id,
      text("A1"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );
    await addConversationMessage(id, text("Q2"), "user", USER);

    const conversation = await getConversation(USER, id);
    const [q1, a1, q2] = conversation.messages;
    expect(q1.parentId).toBeNull();
    expect(a1.parentId).toBe(q1.id);
    expect(a1.modelId).toBe(MODEL.id);
    expect(q2.parentId).toBe(a1.id);
    expect(conversation.currentNode).toBe(q2.id);
    expect(await activeBranch(id)).toEqual(["Q1", "A1", "Q2"]);
  });

  it("starts a sibling branch when a message is edited", async () => {
    const id = await newConversation();
    await addConversationMessage(id, text("Q1"), "user", USER);
    await addConversationMessage(
      id,
      text("A1"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );
    await addConversationMessage(id, text("Q2"), "user", USER);
    await addConversationMessage(
      id,
      text("A2"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );

    const before = await getConversation(USER, id);
    const q2 = before.messages[2];

    // Editing Q2 adds a sibling of Q2 (same parent) and the reply hangs off it.
    await addConversationMessage(id, text("Q2 edited"), "user", USER, q2.id);
    await addConversationMessage(
      id,
      text("A2 edited"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );

    const after = await getConversation(USER, id);
    const edited = after.messages.find((m) => m.content === "Q2 edited")!;
    const editedReply = after.messages.find((m) => m.content === "A2 edited")!;
    expect(edited.parentId).toBe(q2.parentId);
    expect(editedReply.parentId).toBe(edited.id);
    expect(after.messageMap[q2.parentId!].childIds).toEqual([q2.id, edited.id]);
    expect(after.currentNode).toBe(editedReply.id);
    expect(await activeBranch(id)).toEqual(["Q1", "A1", "Q2 edited", "A2 edited"]);
  });

  it("edits the first message into a new root branch", async () => {
    const id = await conversationWithExchange();
    const [q1] = (await getConversation(USER, id)).messages;

    await addConversationMessage(id, text("Q1 edited"), "user", USER, q1.id);

    const conversation = await getConversation(USER, id);
    const edited = conversation.messages.find((m) => m.content === "Q1 edited")!;
    expect(edited.parentId).toBeNull();
    expect(await activeBranch(id)).toEqual(["Q1 edited"]);
  });

  it("regenerates a reply as a sibling of the previous reply", async () => {
    const id = await conversationWithExchange();
    const [q1, a1] = (await getConversation(USER, id)).messages;

    await addConversationMessage(
      id,
      text("A1 again"),
      "assistant",
      undefined,
      undefined,
      false,
      true,
      MODEL.id
    );

    const conversation = await getConversation(USER, id);
    const regenerated = conversation.messages.find((m) => m.content === "A1 again")!;
    expect(regenerated.parentId).toBe(q1.id);
    expect(conversation.messageMap[q1.id].childIds).toEqual([a1.id, regenerated.id]);
    expect(conversation.currentNode).toBe(regenerated.id);
    expect(await activeBranch(id)).toEqual(["Q1", "A1 again"]);
  });

  it("stores internal summaries without moving the current node", async () => {
    const id = await conversationWithExchange();
    const before = await getConversation(USER, id);

    await addConversationMessage(id, text("Summary so far"), "user", USER, undefined, true);

    const after = await getConversation(USER, id);
    expect(after.currentNode).toBe(before.currentNode);
    expect(after.messages.map((m) => m.content)).toEqual(["Q1", "A1"]);
    expect((await getLastSummary(id))?.content).toBe("Summary so far");
  });

  it("adds a user to the conversation the first time they post", async () => {
    const id = await newConversation();
    await addConversationMessage(id, text("hello"), "user", OTHER_USER);
    const members = await prisma.current.conversationUser.findMany({
      where: { conversationId: id }
    });
    expect(members.map((m) => m.userId).sort()).toEqual([USER, OTHER_USER]);
  });

  it("stores searchable text content alongside the parts", async () => {
    const id = await newConversation();
    await addConversationMessage(
      id,
      [
        { type: "text", text: "Look at this" },
        { type: "file", url: "", mediaType: "image/png", filename: "cat.png" }
      ],
      "user",
      USER
    );
    const [message] = (await getConversation(USER, id)).messages;
    expect(message.content).toBe("Look at this\n\n[Image: cat.png]");
  });
});

describe("getConversation", () => {
  it("is only visible to its members", async () => {
    const id = await conversationWithExchange();
    await expect(getConversation(OTHER_USER, id)).rejects.toThrow();
  });

  it("builds childIds and a message map without internal messages", async () => {
    const id = await conversationWithExchange();
    await addConversationMessage(id, text("summary"), "user", USER, undefined, true);

    const conversation = await getConversation(USER, id);
    const [q1, a1] = conversation.messages;
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messageMap[q1.id].childIds).toEqual([a1.id]);
    expect(conversation.messageMap[a1.id].childIds).toEqual([]);
    expect(Object.keys(conversation.messageMap).sort()).toEqual([q1.id, a1.id].sort());
    expect(a1.model?.name).toBe(MODEL.name);
  });
});

describe("updateConversation", () => {
  it("moves the current node to the end of the chosen branch", async () => {
    const id = await newConversation();
    await addConversationMessage(id, text("Q1"), "user", USER);
    await addConversationMessage(
      id,
      text("A1"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );
    await addConversationMessage(id, text("Q2"), "user", USER);
    await addConversationMessage(
      id,
      text("A2"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );
    const [q1, , , a2] = (await getConversation(USER, id)).messages;

    // Branch off Q1 and then switch back to the original Q1.
    await addConversationMessage(id, text("Q1 edited"), "user", USER, q1.id);
    await updateConversation(id, { currentNode: q1.id }, USER);

    const conversation = await getConversation(USER, id);
    expect(conversation.currentNode).toBe(a2.id);
    expect(await activeBranch(id)).toEqual(["Q1", "A1", "Q2", "A2"]);
  });

  it("rejects updates from non-members", async () => {
    const id = await conversationWithExchange();
    await expect(updateConversation(id, { name: "x" }, OTHER_USER)).rejects.toThrow(/not a member/);
  });

  it("renames without touching the current node", async () => {
    const id = await conversationWithExchange();
    const before = await getConversation(USER, id);
    await updateConversation(id, { name: "Renamed" }, USER);
    const after = await getConversation(USER, id);
    expect(after.name).toBe("Renamed");
    expect(after.currentNode).toBe(before.currentNode);
  });
});

describe("rewindConversation", () => {
  it("deletes everything after the chosen message on every branch", async () => {
    const id = await newConversation();
    await addConversationMessage(id, text("Q1"), "user", USER);
    await addConversationMessage(
      id,
      text("A1"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );
    await addConversationMessage(id, text("Q2"), "user", USER);
    await addConversationMessage(
      id,
      text("A2"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );
    const [, a1, q2] = (await getConversation(USER, id)).messages;
    await addConversationMessage(id, text("Q2 edited"), "user", USER, q2.id);
    await addConversationMessage(
      id,
      text("A2 edited"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );

    await rewindConversation(id, USER, a1.id);

    const conversation = await getConversation(USER, id);
    expect(conversation.messages.map((m) => m.content).sort()).toEqual(["A1", "Q1"]);
    expect(conversation.currentNode).toBe(a1.id);
    expect(await activeBranch(id)).toEqual(["Q1", "A1"]);
  });

  it("rejects non-members", async () => {
    const id = await conversationWithExchange();
    await expect(rewindConversation(id, OTHER_USER, "any")).rejects.toThrow();
  });
});

describe("updateConversationMessage", () => {
  it("replaces parts and derived content", async () => {
    const id = await conversationWithExchange();
    const [q1] = (await getConversation(USER, id)).messages;
    await updateConversationMessage(id, q1.id, { parts: text("Q1 corrected") });
    const [updated] = (await getConversation(USER, id)).messages;
    expect(updated.content).toBe("Q1 corrected");
    expect(updated.parts).toEqual(text("Q1 corrected"));
  });
});

describe("createConversation", () => {
  it("leaves the default name when the user has no key for the model", async () => {
    const conversation = await createConversation({
      agentId: null,
      modelId: MODEL.id,
      userId: USER,
      messages: [{ role: "user", parts: text("Hi") }] as DBMessage[]
    });
    expect(conversation.name).toBe("New Chat");
    expect(naming.generateConversationName).not.toHaveBeenCalled();
  });

  it("stores the messages, names the chat and registers the creator", async () => {
    await giveApiKey();
    const messages = [
      { role: "user", parts: text("Hi") },
      { role: "assistant", parts: text("Hello!") }
    ] as DBMessage[];

    const conversation = await createConversation({
      agentId: null,
      modelId: MODEL.id,
      userId: USER,
      messages,
      folderId: "folder-1"
    });

    expect(conversation.name).toBe("Generated Title");
    expect(conversation.folderId).toBe("folder-1");
    expect(conversation.messages.map((m) => [m.role, m.content, m.modelId])).toEqual([
      ["user", "Hi", null],
      ["assistant", "Hello!", MODEL.id]
    ]);
    expect(await activeBranch(conversation.id)).toEqual(["Hi", "Hello!"]);
    expect(naming.generateConversationName).toHaveBeenCalledOnce();
  });

  it("keeps the default name when there are no messages", async () => {
    await giveApiKey();
    const conversation = await createConversation({
      agentId: null,
      modelId: MODEL.id,
      userId: USER,
      messages: []
    });
    expect(conversation.name).toBe("New Chat");
    expect(naming.generateConversationName).not.toHaveBeenCalled();
  });
});

describe("importChat", () => {
  it("imports messages in order, reports progress and clears the importing flag", async () => {
    await giveApiKey();
    const conversation = await prisma.current.conversation.create({
      data: {
        name: "Import",
        modelId: MODEL.id,
        isImporting: true,
        conversationUsers: { create: { userId: USER } }
      }
    });
    const progress: number[] = [];

    await importChat(
      conversation.id,
      USER,
      MODEL.id,
      [
        { id: "1", content: "Q1", role: "user", parentId: null, senderId: USER, name: "me" },
        { id: "2", content: "A1", role: "assistant", parentId: "1", senderId: null, name: "bot" }
      ],
      (p) => progress.push(p)
    );

    const imported = await getConversation(USER, conversation.id);
    expect(imported.isImporting).toBe(false);
    expect(imported.name).toBe("Generated Title");
    expect(await activeBranch(conversation.id)).toEqual(["Q1", "A1"]);
    expect(progress.at(-1)).toBe(100);
  });
});

describe("deleteConversation", () => {
  it("removes messages, the conversation and the files they reference", async () => {
    const id = await newConversation();
    await addConversationMessage(
      id,
      [
        {
          type: "file",
          key: `${USER}/photo.png`,
          mediaType: "image/png",
          filename: "photo.png"
        } as never
      ],
      "user",
      USER
    );
    await addConversationMessage(
      id,
      [
        {
          type: "tool-generateImage",
          toolCallId: "call-1",
          state: "output-available",
          input: { prompt: "a cat" },
          output: { success: true, key: `${USER}/generated.png` }
        } as never
      ],
      "assistant"
    );

    const result = await deleteConversation(USER, id);

    expect(result).toEqual({ id, deleted: true });
    expect(r2.bulkDeleteFilesFromR2).toHaveBeenCalledWith([
      `${USER}/photo.png`,
      `${USER}/generated.png`
    ]);
    expect(await prisma.current.message.findMany({ where: { conversationId: id } })).toEqual([]);
    expect(await prisma.current.conversation.findUnique({ where: { id } })).toBeNull();
  });

  it("rejects non-members", async () => {
    const id = await conversationWithExchange();
    await expect(deleteConversation(OTHER_USER, id)).rejects.toThrow(/not a member/);
  });
});

describe("shareConversation", () => {
  it("snapshots the active branch and is idempotent", async () => {
    const id = await newConversation();
    await addConversationMessage(id, text("Q1"), "user", USER);
    await addConversationMessage(
      id,
      text("A1"),
      "assistant",
      undefined,
      undefined,
      false,
      false,
      MODEL.id
    );
    const [q1] = (await getConversation(USER, id)).messages;
    await addConversationMessage(id, text("Q1 edited"), "user", USER, q1.id);

    const sharedId = await shareConversation(id, USER);
    const again = await shareConversation(id, USER);

    expect(again).toBe(sharedId);
    const snapshot = await prisma.current.sharedMessage.findMany({
      where: { sharedConversationId: sharedId },
      orderBy: { createdAt: "asc" }
    });
    expect(snapshot.map((m) => m.content)).toEqual(["Q1 edited"]);
  });
});

describe("bulk operations", () => {
  it("refuses to delete when any conversation is not the user's", async () => {
    const mine = await conversationWithExchange();
    const theirs = await prisma.current.conversation.create({
      data: { name: "theirs", conversationUsers: { create: { userId: OTHER_USER } } }
    });
    await expect(bulkDeleteConversations(USER, [mine, theirs.id])).rejects.toThrow(/access denied/);
    expect(await prisma.current.conversation.findUnique({ where: { id: mine } })).not.toBeNull();
  });

  it("deletes several conversations at once", async () => {
    const a = await conversationWithExchange();
    const b = await conversationWithExchange();
    expect(await bulkDeleteConversations(USER, [a, b])).toEqual({ deleted: 2 });
    expect(await prisma.current.conversation.findMany()).toEqual([]);
    expect(await prisma.current.message.findMany()).toEqual([]);
  });

  it("moves a conversation into a folder the user owns", async () => {
    const id = await conversationWithExchange();
    await addToFolder(USER, id, "folder-1");
    expect((await getConversation(USER, id)).folderId).toBe("folder-1");
    await expect(addToFolder(USER, id, "missing")).rejects.toThrow(/Folder not found/);
  });
});
