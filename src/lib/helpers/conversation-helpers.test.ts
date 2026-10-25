import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
import type { DBMessage } from "$lib/types/db";
import type { Message } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  findLastNodeInBranch,
  formatMessageContent,
  getConversationMessages,
  getMessageSiblings
} from "./conversation-helpers";

function msg(id: string, parentId: string | null, childIds: string[] = []): DBMessage {
  return {
    id,
    role: id.startsWith("u") ? "user" : "assistant",
    parts: [{ type: "text", text: id }],
    parentId,
    childIds,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * u1 ─ a1 ─ u2 ─ a2
 *    └ a1b ─ u2b
 * (a1b is a regenerated reply to u1; u2b continues it)
 */
function tree(currentNode: string | null): ConversationWithMessageMap {
  const messages = [
    msg("u1", null, ["a1", "a1b"]),
    msg("a1", "u1", ["u2"]),
    msg("u2", "a1", ["a2"]),
    msg("a2", "u2"),
    msg("a1b", "u1", ["u2b"]),
    msg("u2b", "a1b")
  ];
  return {
    currentNode,
    messages,
    messageMap: Object.fromEntries(messages.map((m) => [m.id, m]))
  } as unknown as ConversationWithMessageMap;
}

const ids = (messages: { id: string }[]) => messages.map((m) => m.id);

describe("getConversationMessages", () => {
  it("walks up from the current node and down its first children", () => {
    expect(ids(getConversationMessages(tree("a2")))).toEqual(["u1", "a1", "u2", "a2"]);
    expect(ids(getConversationMessages(tree("u2b")))).toEqual(["u1", "a1b", "u2b"]);
  });

  it("continues past the current node along the first child", () => {
    expect(ids(getConversationMessages(tree("u1")))).toEqual(["u1", "a1", "u2", "a2"]);
    expect(ids(getConversationMessages(tree("a1b")))).toEqual(["u1", "a1b", "u2b"]);
  });

  it("returns nothing for an empty conversation", () => {
    expect(getConversationMessages(tree(null))).toEqual([]);
  });

  it("stops at a node missing from the map", () => {
    const conversation = tree("a2");
    delete conversation.messageMap["a1"];
    expect(ids(getConversationMessages(conversation))).toEqual(["u2", "a2"]);
  });
});

describe("findLastNodeInBranch", () => {
  it("follows first children to the end of the branch", () => {
    expect(findLastNodeInBranch(tree("u1"), "u1")).toBe("a2");
    expect(findLastNodeInBranch(tree("u1"), "a1b")).toBe("u2b");
  });

  it("returns a leaf unchanged", () => {
    expect(findLastNodeInBranch(tree("a2"), "a2")).toBe("a2");
  });

  it("returns the start node when it is unknown", () => {
    expect(findLastNodeInBranch(tree("a2"), "nope")).toBe("nope");
  });
});

describe("getMessageSiblings", () => {
  const messages = tree("a2").messages as unknown as Message[];

  it("lists messages sharing a parent, in order", () => {
    expect(ids(getMessageSiblings(messages, "a1b"))).toEqual(["a1", "a1b"]);
  });

  it("treats root messages as siblings of each other", () => {
    expect(ids(getMessageSiblings(messages, "u1"))).toEqual(["u1"]);
  });

  it("is empty for unknown messages or no messages", () => {
    expect(getMessageSiblings(messages, "zzz")).toEqual([]);
    expect(getMessageSiblings(undefined, "u1")).toEqual([]);
  });
});

describe("formatMessageContent", () => {
  it("joins text parts and labels attachments", () => {
    expect(
      formatMessageContent([
        { type: "text", text: "Hello" },
        { type: "file", url: "https://x/y.png", mediaType: "image/png", filename: "y.png" },
        { type: "file", url: "https://x/clip.mp4", mediaType: "video/mp4" },
        { type: "text", text: "Bye" }
      ])
    ).toBe("Hello\n\n[Image: y.png]\n\n[Video: https://x/clip.mp4]\n\nBye");
  });

  it("describes generated images and ignores other parts", () => {
    expect(
      formatMessageContent([
        { type: "step-start" },
        {
          type: "tool-generateImage",
          toolCallId: "c1",
          state: "output-available",
          input: { prompt: "a fox" },
          output: { success: true, key: "u/fox.png" }
        } as never,
        { type: "reasoning", text: "thinking" }
      ])
    ).toBe("[Generated image: a fox]");
  });

  it("describes chess analysis", () => {
    expect(
      formatMessageContent([
        {
          type: "tool-analyzePosition",
          toolCallId: "c1",
          state: "output-available",
          input: {},
          output: { success: true, display: "#2", bestMove: "Qh7+" }
        } as never
      ])
    ).toBe("[Chess analysis: #2, best move Qh7+]");
  });

  it("returns an empty string with no printable parts", () => {
    expect(formatMessageContent([])).toBe("");
  });
});
