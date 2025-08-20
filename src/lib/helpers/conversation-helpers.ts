import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
import type { DBMessage } from "$lib/types/db";
import type { Message } from "@prisma/client";
import type { UIDataTypes, UIMessagePart, UITools } from "ai";

export function getConversationMessages(conversation: ConversationWithMessageMap): DBMessage[] {
  const messages: DBMessage[] = [];

  // Collect messages by traversing upwards from the current node
  let currentNode = conversation.currentNode;
  while (currentNode != null) {
    const node = conversation.messageMap[currentNode];
    if (node) {
      messages.unshift(node); // Prepend to maintain chronological order
      currentNode = node.parentId;
    } else {
      break;
    }
  }

  // Traverse downwards from the original currentNode, following only the first child
  currentNode = conversation.currentNode;

  if (!currentNode) return messages;

  let node = conversation.messageMap[currentNode];
  while (node && node.childIds.length > 0) {
    const firstChildId = node.childIds[0];
    const childNode = conversation.messageMap[firstChildId];
    if (childNode) {
      messages.push(childNode);
      node = childNode;
    } else {
      break;
    }
  }

  return messages;
}

export function getMessageSiblings(messages: Message[] | undefined, messageId: string): Message[] {
  if (!messages) return [];
  const message = messages.find((m) => m.id === messageId);
  if (!message) {
    return [];
  }
  const filter = messages.filter((m) => m.parentId === message.parentId);
  return filter;
}

export function findLastNodeInBranch(
  conversation: ConversationWithMessageMap,
  startNodeId: string
): string {
  let currentNodeId = startNodeId;
  let node = conversation.messageMap[currentNodeId];

  // Traverse downwards following the first child each time
  while (node && node.childIds && node.childIds.length > 0) {
    const firstChildId = node.childIds[0];
    node = conversation.messageMap[firstChildId];
    if (node) {
      currentNodeId = node.id;
    } else {
      break;
    }
  }

  return currentNodeId;
}

export function formatMessageContent(parts: UIMessagePart<UIDataTypes, UITools>[]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
}
