import { findLastNodeInBranch, getConversationMessages as getMessages } from "$lib/helpers";
import AIService from "$lib/server/ai-service";
import { getApiKey } from "$lib/server/api-keys-service";
import {
  conversationUsers,
  conversations,
  db,
  messages,
  prisma,
  sharedConversations
} from "$lib/server/db";
import { getModel } from "$lib/server/models-service";
import { AIProvider } from "$lib/types/db";
import type { Prisma } from "@prisma/client";
import { eq, sql } from "drizzle-orm";
import { getFolder } from "./folders-service";

export interface ConversationCreateOptions {
  name?: string;
  agentId: string | null;
  modelId: string | null;
  userId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  currentNode?: string;
  isImporting?: boolean;
  isPinned?: boolean;
}

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  parentId: string | null;
  childIds: string[];
}

export type ConversationWithMessageMap = Prisma.ConversationGetPayload<{
  include: { messages: true };
}> & {
  messageMap: Record<string, Message>;
};

export interface MessageImport {
  id: string;
  content: string;
  role: "user" | "assistant";
  parentId: string | null;
  senderId: string | null | undefined;
  name: string | null;
}

export async function getConversations(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  sortBy: string = "lastUpdated DESC",
  search?: string,
  folderId?: string
) {
  const result = await db
    .select({
      id: conversations.id,
      name: conversations.name,
      modelId: conversations.modelId,
      agentId: conversations.agentId,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      lastUpdated: sql`COALESCE(MAX(${messages.updatedAt}), ${conversations.updatedAt}) AS lastUpdated`,
      currentNode: conversations.currentNode,
      isImporting: conversations.isImporting,
      sharedConversationId: sharedConversations.id,
      isPinned: conversations.isPinned,
      folderId: conversations.folderId
    })
    .from(conversations)
    .innerJoin(conversationUsers, eq(conversations.id, conversationUsers.conversationId))
    .leftJoin(sharedConversations, eq(conversations.id, sharedConversations.conversationId))
    .leftJoin(messages, eq(conversations.id, messages.conversationId))
    .where(
      sql`(${folderId ? sql`${conversations.folderId} = ${folderId}` : sql`${conversations.folderId} IS NULL`}) AND (${conversationUsers.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
    )
    .groupBy(
      conversations.id,
      conversations.name,
      conversations.modelId,
      conversations.agentId,
      conversations.createdAt,
      conversations.currentNode,
      conversations.isImporting,
      sharedConversations.id,
      conversations.isPinned,
      conversations.folderId
    )
    .orderBy(sql`${conversations.isPinned} DESC, ${sql.raw(sortBy)}`)
    .limit(limit)
    .offset(offset);

  const total = (
    await db
      .select({
        count: sql`COUNT(DISTINCT ${conversations.id})`.mapWith(Number)
      })
      .from(conversations)
      .innerJoin(conversationUsers, eq(conversations.id, conversationUsers.conversationId))
      .where(
        sql`(${folderId ? sql`${conversations.folderId} = ${folderId}` : sql`${conversations.folderId} IS NULL`}) AND (${conversationUsers.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
      )
  ).at(0);

  return { conversations: result, total: total?.count };
}

export async function getConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId, conversationUsers: { some: { userId } } },
    include: {
      messages: { where: { isInternal: false }, orderBy: { createdAt: "asc" } }
    }
  });

  const messagesWithChildIds = conversation.messages.map((message) => ({
    ...message,
    childIds: conversation.messages.filter((m) => m.parentId === message.id).map((m) => m.id)
  }));

  conversation.messages = messagesWithChildIds;

  const messageMap = createMessageMap(messagesWithChildIds);

  (conversation as ConversationWithMessageMap).messageMap = messageMap;

  return conversation as ConversationWithMessageMap;
}

export async function createConversation({
  name,
  agentId,
  modelId,
  userId,
  messages,
  isImporting
}: ConversationCreateOptions) {
  const conversation = await prisma.conversation.create({
    data: {
      name: name ? name : "New Chat",
      agentId,
      modelId,
      isImporting: isImporting ? true : false,
      conversationUsers: {
        create: {
          userId
        }
      }
    }
  });

  for (const message of messages) {
    await addConversationMessage(
      conversation.id,
      message.content,
      message.role,
      message.role === "user" ? userId : undefined
    );
  }

  if (messages.length === 0) return getConversation(userId, conversation.id);
  const title = await generateConversationName(messages, modelId, userId);
  if (title) await updateConversation(conversation.id, { name: title });

  return getConversation(userId, conversation.id);
}

export async function updateConversation(
  conversationId: string,
  data: Prisma.ConversationUncheckedUpdateInput,
  userId?: string
) {
  if (userId) {
    const users = await getConversationUsers(conversationId);

    if (!users.find((user) => user.userId === userId)) {
      throw new Error("User is not a member of the conversation");
    }
  }

  if (data.currentNode) {
    // Get the conversation with its message map
    const conversation = await getConversation(userId!, conversationId);

    if (conversation) {
      // Check if the current node has children, if yes, set to the last one in the branch
      const lastNodeId = findLastNodeInBranch(conversation, data.currentNode.toString());

      // Only update if needed
      if (lastNodeId !== data.currentNode) {
        data.currentNode = lastNodeId;
      }
    }
  }

  const result = await prisma.conversation.update({
    where: { id: conversationId },
    data
  });

  return result;
}

export async function deleteConversation(userId: string, conversationId: string) {
  const users = await getConversationUsers(conversationId);

  if (!users.find((user) => user.userId === userId)) {
    throw new Error("User is not a member of the conversation");
  }

  await prisma.conversation.delete({ where: { id: conversationId } });

  return { id: conversationId, deleted: true };
}

export async function addConversationUser(conversationId: string, userId: string) {
  return prisma.conversationUser.create({ data: { conversationId, userId } });
}

export async function getConversationUsers(conversationId: string) {
  return prisma.conversationUser.findMany({ where: { conversationId } });
}

export async function addConversationMessage(
  conversationId: string,
  content: string,
  role: "user" | "assistant",
  userId?: string,
  messageId?: string,
  isInternal: boolean = false,
  regenerate: boolean = false
) {
  const message = await prisma.message.create({
    data: {
      conversationId,
      userId,
      content,
      role,
      isInternal
    }
  });

  const { id } = message;

  const parent = await findParent(role, messageId, conversationId, regenerate);

  if (parent) {
    await updateConversationMessage(conversationId, id, { parentId: parent.id });
  }

  if (userId) {
    const user = await prisma.conversationUser.findFirst({
      where: {
        conversationId,
        userId
      }
    });

    if (!user) {
      await addConversationUser(conversationId, userId);
    }
  }

  if (!isInternal) await updateConversation(conversationId, { currentNode: id });
}

async function findParent(
  role: string,
  messageId: string | undefined,
  conversationId: string,
  regenerate: boolean
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (role === "user") {
    if (messageId) {
      const currentMessage = await getConversationMessage(conversationId, messageId);

      if (currentMessage?.parentId) {
        const parent = await prisma.message.findFirstOrThrow({
          where: {
            id: currentMessage.parentId,
            conversationId
          }
        });

        return parent;
      }
      return null;
    }

    if (!conversation.currentNode) return null;

    const parent = await prisma.message.findFirst({
      where: {
        conversationId,
        id: conversation.currentNode
      }
    });
    return parent;
  }

  if (!conversation.currentNode) return null;

  const currentNode = await prisma.message.findFirst({
    where: {
      conversationId,
      id: conversation.currentNode
    }
  });

  if (currentNode) {
    if (currentNode.role === "user") {
      return currentNode;
    } else if (currentNode.parentId && regenerate) {
      const previousMessage = await prisma.message.findFirst({
        where: {
          conversationId,
          id: currentNode.parentId
        }
      });

      if (previousMessage) {
        return previousMessage;
      }
    } else if (currentNode.parentId && !regenerate) {
      return currentNode;
    }
  }
  return null;
}

export async function getConversationMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" }
  });
}

export async function getConversationMessage(conversationId: string, messageId: string) {
  return prisma.message.findFirst({
    where: { id: messageId, conversationId }
  });
}

export async function getInternalMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId, isInternal: true },
    orderBy: { createdAt: "asc" }
  });
}

export async function getLastSummary(conversationId: string) {
  const message = await prisma.message.findFirst({
    where: { conversationId, isInternal: true },
    orderBy: { createdAt: "desc" }
  });

  return message;
}

export async function updateConversationMessage(
  conversationId: string,
  messageId: string,
  data: { content?: string; parentId?: string }
) {
  return prisma.message.update({
    where: { id: messageId, conversationId },
    data
  });
}

export async function deleteConversationMessage(conversationId: string, messageId: string) {
  return prisma.message.delete({
    where: { id: messageId, conversationId }
  });
}

function createMessageMap(messages: Message[]): Record<string, Message> {
  return messages.reduce<Record<string, Message>>((obj, message) => {
    obj[message.id] = message;
    return obj;
  }, {});
}

async function generateConversationName(
  messages: { role: string; content: string }[],
  modelId: string | null,
  userId: string
) {
  if (!modelId) return null;

  const model = await getModel(modelId);

  if (!model) return null;

  const apiKey = await getApiKey(userId, model.provider as AIProvider);

  if (!apiKey) return null;

  if (apiKey.provider === AIProvider.Mistral) {
    modelId = "mistral-small-latest";
  } else if (apiKey.provider === AIProvider.OpenAI) {
    modelId = "gpt-4o-mini";
  } else if (apiKey.provider === AIProvider.Google) {
    modelId = "models/gemini-1.5-flash-latest";
  } else if (apiKey.provider === AIProvider.Anthropic) {
    modelId = "claude-3-5-haiku-20241022";
  }

  const service = new AIService(apiKey.provider as AIProvider, apiKey.key);

  return service.generateConversationName(messages, modelId);
}

export async function importChat(
  conversationId: string,
  userId: string,
  modelId: string,
  data: MessageImport[],
  updateProgress?: (progress: number) => void
) {
  const messages = data.map((m) => ({ role: m.role, content: m.content }));

  for (const message of messages) {
    await addConversationMessage(
      conversationId,
      message.content,
      message.role,
      message.role === "user" ? userId : undefined
    );

    if (updateProgress)
      updateProgress(Math.round((messages.indexOf(message) / messages.length) * 100));
  }

  const title = await generateConversationName(messages, modelId, userId);
  if (title) await updateConversation(conversationId, { name: title });

  if (updateProgress) updateProgress(100);

  await updateConversation(conversationId, { isImporting: false });
}

function collectChildMessageIds(conversation: ConversationWithMessageMap): string[] {
  const { currentNode, messageMap } = conversation;

  // If the current node is not found, return an empty array
  if (!currentNode) {
    return [];
  }

  function dfs(nodeId: string): string[] {
    // Get the current message object from the message map
    const currentMessage = messageMap[nodeId];

    // If the message doesn't exist, return an empty array (edge case)
    if (!currentMessage) {
      return [];
    }

    // Collect all child ids recursively
    const allChildIds = currentMessage.childIds.flatMap((childId) => dfs(childId));

    // Return the current node and all its descendants
    return [nodeId, ...allChildIds];
  }

  // Start traversal from the current node but exclude the current node itself from the result
  return dfs(currentNode).slice(1);
}

export async function rewindConversation(
  conversationId: string,
  userId: string,
  messageId: string
) {
  const conversation = await getConversation(userId, conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  conversation.currentNode = messageId;
  const childMessageIds = collectChildMessageIds(conversation);

  await prisma.message.deleteMany({
    where: {
      conversationId,
      id: {
        in: childMessageIds
      }
    }
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { currentNode: messageId }
  });
}

export async function shareConversation(conversationId: string, userId: string) {
  const conversation = await getConversation(userId, conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const existingConversation = await getSharedConversationByConversationId(conversationId);

  if (existingConversation) {
    return existingConversation;
  }

  const result = await prisma.sharedConversation.create({
    data: {
      conversationId,
      name: conversation.name,
      userId,
      sharedAt: new Date(),
      agentId: conversation.agentId
    }
  });

  const messages = getMessages(conversation);

  await prisma.sharedMessage.createMany({
    data: messages.map((message) => ({
      sharedConversationId: result.id,
      content: message.content,
      role: message.role
    }))
  });

  return result.id;
}

export async function getSharedConversation(conversationId: string) {
  const conversation = await prisma.sharedConversation.findUnique({
    where: { id: conversationId },
    include: { sharedMessages: { orderBy: { createdAt: "asc" } } }
  });

  return conversation;
}

async function getSharedConversationByConversationId(conversationId: string) {
  const conversation = await prisma.sharedConversation.findFirst({
    where: { conversationId }
  });

  return conversation;
}

export async function getSharedConversations(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  sortBy: string = "sharedConversation.updatedAt DESC",
  search?: string
) {
  const result = await db
    .select({
      id: sharedConversations.id,
      name: sharedConversations.name,
      agentId: sharedConversations.agentId,
      createdAt: sharedConversations.createdAt,
      updatedAt: sharedConversations.updatedAt,
      sharedAt: sharedConversations.sharedAt
    })
    .from(sharedConversations)
    .where(
      sql`(${sharedConversations.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
    )
    .orderBy(sql`${sql.raw(sortBy)}`)
    .limit(limit)
    .offset(offset);

  const total = (
    await db
      .select({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(sharedConversations)
      .where(
        sql`(${sharedConversations.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
      )
  ).at(0);

  return { conversations: result, total: total?.count };
}

export async function deleteSharedConversation(conversationId: string, userId: string) {
  const conversation = await getSharedConversation(conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.userId !== userId) {
    throw new Error("You do not have permission to delete this conversation");
  }

  await prisma.sharedConversation.delete({ where: { id: conversationId } });
}

export async function addToFolder(userId: string, conversationId: string, folderId: string) {
  const folder = await getFolder(userId, folderId);

  if (!folder) {
    throw new Error("Folder not found");
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data: { folderId }
  });
}

export async function removeFromFolder(userId: string, conversationId: string, folderId: string) {
  const folder = await getFolder(userId, folderId);

  if (!folder) {
    throw new Error("Folder not found");
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data: { folderId: null }
  });
}
