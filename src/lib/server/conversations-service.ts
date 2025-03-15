import { db } from "$lib/drizzle/db";
import {
  AIProvider,
  conversationUsers,
  conversations,
  messages,
  sharedConversations,
  sharedMessages,
  type ConversationWithMessages
} from "$lib/drizzle/schema";
import { getConversationMessages as getMessages } from "$lib/helpers";
import AIService from "$lib/server/ai-service";
import { getApiKey } from "$lib/server/api-keys-service";
import { getModel } from "$lib/server/models-service";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
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

export type ConversationWithMessageMap = ConversationWithMessages & {
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
  sortBy: string = "conversation.updatedAt DESC",
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
      currentNode: conversations.currentNode,
      isImporting: conversations.isImporting,
      sharedConversationId: sharedConversations.id,
      isPinned: conversations.isPinned
    })
    .from(conversations)
    .innerJoin(conversationUsers, eq(conversations.id, conversationUsers.conversationId))
    .leftJoin(sharedConversations, eq(conversations.id, sharedConversations.conversationId))
    .where(
      sql`(${folderId ? sql`${conversations.folderId} = ${folderId}` : sql`${conversations.folderId} IS NULL`}) AND (${conversationUsers.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
    )
    .orderBy(sql`${sql.raw(`conversation.isPinned DESC, ${sortBy}`)}`)
    .limit(limit)
    .offset(offset);

  const total = (
    await db
      .select({
        count: sql`COUNT(*)`.mapWith(Number)
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
  const conversation: ConversationWithMessages | undefined = await db.query.conversations.findFirst(
    {
      with: {
        messages: { where: eq(messages.isInternal, false) }
      },
      where: eq(conversations.id, conversationId),
      orderBy: [asc(messages.createdAt)]
    }
  );

  if (!conversation) return undefined;

  const users = await getConversationUsers(conversationId);

  if (!users.find((user) => user.userId === userId)) {
    throw new Error("User is not a member of the conversation");
  }

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
  const conversation = (
    await db
      .insert(conversations)
      .values({
        name: name ? name : "New Chat",
        agentId,
        modelId,
        isImporting: isImporting ? true : false
      })
      .returning()
  ).at(0);

  if (!conversation) throw new Error("Failed to create conversation");

  await addConversationUser(conversation.id, userId);

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
  data: Partial<ConversationCreateOptions>,
  userId?: string
) {
  if (userId) {
    const users = await getConversationUsers(conversationId);

    if (!users.find((user) => user.userId === userId)) {
      throw new Error("User is not a member of the conversation");
    }
  }

  return (
    await db.update(conversations).set(data).where(eq(conversations.id, conversationId)).returning()
  ).at(0);
}

export async function deleteConversation(userId: string, conversationId: string) {
  const users = await getConversationUsers(conversationId);

  if (!users.find((user) => user.userId === userId)) {
    throw new Error("User is not a member of the conversation");
  }

  await db.delete(conversations).where(eq(conversations.id, conversationId));

  return { id: conversationId, deleted: true };
}

export async function addConversationUser(conversationId: string, userId: string) {
  return db.insert(conversationUsers).values({ conversationId, userId }).returning();
}

export async function removeConversationUser(conversationId: string, userId: string) {
  return db
    .delete(conversationUsers)
    .where(
      and(
        eq(conversationUsers.conversationId, conversationId),
        eq(conversationUsers.userId, userId)
      )
    );
}

export async function getConversationUsers(conversationId: string) {
  return db
    .select()
    .from(conversationUsers)
    .where(eq(conversationUsers.conversationId, conversationId));
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
  const message = (
    await db
      .insert(messages)
      .values({ conversationId, userId, content, role, isInternal })
      .returning()
  ).at(0);

  if (!message) throw new Error("Failed to add message");

  const parent = await findParent(role, messageId, conversationId, regenerate);

  if (parent) {
    await updateConversationMessage(conversationId, message.id, { parentId: parent.message.id });
  }

  if (userId) {
    const user = await db.query.conversationUsers.findFirst({
      where: and(
        eq(conversationUsers.conversationId, conversationId),
        eq(conversationUsers.userId, userId)
      )
    });

    if (!user) {
      await addConversationUser(conversationId, userId);
    }
  }

  if (!isInternal) await updateConversation(conversationId, { currentNode: message.id });
}

async function findParent(
  role: string,
  messageId: string | undefined,
  conversationId: string,
  regenerate: boolean
) {
  if (role === "user") {
    if (messageId) {
      const currentMessage = await getConversationMessage(conversationId, messageId);

      if (currentMessage?.parentId) {
        const parent = (
          await db
            .select()
            .from(messages)
            .innerJoin(conversations, eq(messages.conversationId, conversations.id))
            .where(
              and(
                eq(messages.id, currentMessage.parentId),
                eq(messages.conversationId, conversationId)
              )
            )
        ).at(0);

        return parent;
      }
      return null;
    }

    const parent = (
      await db
        .select()
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.id, conversations.currentNode)
          )
        )
    ).at(0);

    return parent;
  }

  const currentNode = (
    await db
      .select()
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(eq(messages.conversationId, conversationId), eq(messages.id, conversations.currentNode))
      )
  ).at(0);

  if (currentNode) {
    if (currentNode?.message.role === "user") {
      return currentNode;
    } else if (currentNode.message.parentId && regenerate) {
      const previousMessage = (
        await db
          .select()
          .from(messages)
          .innerJoin(conversations, eq(messages.conversationId, conversations.id))
          .where(
            and(
              eq(messages.conversationId, conversationId),
              eq(messages.id, currentNode.message.parentId)
            )
          )
      ).at(0);

      if (previousMessage) {
        return previousMessage;
      }
    } else if (currentNode.message.parentId && !regenerate) {
      return currentNode;
    }
  }
  return null;
}

export async function getConversationMessages(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

export async function getConversationMessage(conversationId: string, messageId: string) {
  return db.query.messages.findFirst({
    where: and(eq(messages.id, messageId), eq(messages.conversationId, conversationId))
  });
}

export async function getInternalMessages(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.isInternal, true)));
}

export async function getLastSummary(conversationId: string) {
  return db.query.messages.findFirst({
    where: and(eq(messages.conversationId, conversationId), eq(messages.isInternal, true)),
    orderBy: [desc(messages.createdAt)]
  });
}

export async function updateConversationMessage(
  conversationId: string,
  messageId: string,
  data: { content?: string; parentId?: string }
) {
  return db
    .update(messages)
    .set(data)
    .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)))
    .returning();
}

export async function deleteConversationMessage(conversationId: string, messageId: string) {
  return db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)));
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

  await db
    .delete(messages)
    .where(and(eq(messages.conversationId, conversationId), inArray(messages.id, childMessageIds)));

  await db
    .update(conversations)
    .set({ currentNode: messageId })
    .where(eq(conversations.id, conversationId));
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

  const sharedConversation = (
    await db
      .insert(sharedConversations)
      .values({
        userId,
        conversationId,
        name: conversation.name,
        sharedAt: new Date(),
        agentId: conversation.agentId
      })
      .returning()
  ).at(0);

  if (!sharedConversation) {
    throw new Error("Failed to share conversation");
  }

  const messages = getMessages(conversation);

  await db.insert(sharedMessages).values(
    messages.map((message) => ({
      sharedConversationId: sharedConversation.id,
      content: message.content,
      role: message.role
    }))
  );

  return sharedConversation;
}

export async function getSharedConversation(conversationId: string) {
  const conversation = await db.query.sharedConversations.findFirst({
    with: {
      sharedMessages: { where: eq(sharedMessages.sharedConversationId, conversationId) }
    },
    where: eq(sharedConversations.id, conversationId)
  });

  return conversation;
}

async function getSharedConversationByConversationId(conversationId: string) {
  const conversation = await db.query.sharedConversations.findFirst({
    where: eq(sharedConversations.conversationId, conversationId)
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

  await db.delete(sharedConversations).where(eq(sharedConversations.id, conversationId));
}

export async function addToFolder(userId: string, conversationId: string, folderId: string) {
  const folder = await getFolder(userId, folderId);

  if (!folder) {
    throw new Error("Folder not found");
  }

  return db.update(conversations).set({ folderId }).where(eq(conversations.id, conversationId));
}

export async function removeFromFolder(userId: string, conversationId: string, folderId: string) {
  const folder = await getFolder(userId, folderId);

  if (!folder) {
    throw new Error("Folder not found");
  }

  return db
    .update(conversations)
    .set({ folderId: null })
    .where(eq(conversations.id, conversationId));
}
