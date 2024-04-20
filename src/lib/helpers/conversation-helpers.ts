import { browser } from "$app/environment";
import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
import { useQueryClient } from "@tanstack/svelte-query";

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

  if (node && node.id !== conversation.currentNode) {
    // Update the current node to the last child node
    if (browser) {
      fetch(`/api/conversations/${conversation.id}`, {
        method: "PUT",
        body: JSON.stringify({ currentNode: node.id })
      });
      const client = useQueryClient();
      client.invalidateQueries({ queryKey: ["conversation", conversation.id] });
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
