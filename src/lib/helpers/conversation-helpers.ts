import type { ConversationWithMessageMap } from "$lib/server/conversations-service";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  childIds?: string[];
  parentId: string | null;
}

export function getConversationMessages(conversation: ConversationWithMessageMap) {
  const messages: Message[] = [];

  // Collect messages by traversing upwards from the current node
  let currentNode = conversation.currentNode;
  while (currentNode != null) {
    const node = conversation.messageMap[currentNode];
    if (node) {
      messages.unshift(formatMessage(node)); // Prepend to maintain chronological order
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
      messages.push(formatMessage(childNode));
      node = childNode;
    } else {
      break;
    }
  }

  // Helper function to format a node into Message type
  function formatMessage(node: Message): Message {
    return {
      id: node.id,
      role: node.role as "user" | "assistant",
      content: node.content,
      childIds: node.childIds,
      parentId: node.parentId
    };
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
