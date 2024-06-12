import { db } from "$lib/drizzle/db";
import {
  AIProvider,
  conversationUsers,
  conversations,
  messages,
  type ConversationWithMessages
} from "$lib/drizzle/schema";
import AIService from "$lib/server/ai-service";
import { getApiKey } from "$lib/server/api-keys-service";
import { getModel } from "$lib/server/models-service";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export interface ConversationCreateOptions {
  name?: string;
  agentId: string | null;
  modelId: string | null;
  userId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  currentNode?: string;
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

export async function getConversations(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  sortBy: string = "conversation.updatedAt DESC",
  search?: string
) {
  const result = await db
    .select({
      id: conversations.id,
      name: conversations.name,
      modelId: conversations.modelId,
      agentId: conversations.agentId,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      currentNode: conversations.currentNode
    })
    .from(conversations)
    .innerJoin(conversationUsers, eq(conversations.id, conversationUsers.conversationId))
    .where(
      sql`(${conversationUsers.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
    )
    .orderBy(sql`${sql.raw(sortBy)}`)
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
        sql`(${conversationUsers.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
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
  messages
}: ConversationCreateOptions) {
  const conversation = (
    await db
      .insert(conversations)
      .values({ name: name ? name : "New Chat", agentId, modelId })
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
  isInternal: boolean = false
) {
  const message = (
    await db
      .insert(messages)
      .values({ conversationId, userId, content, role, isInternal })
      .returning()
  ).at(0);

  if (!message) throw new Error("Failed to add message");

  const parent = await findParent(role, messageId, conversationId);

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

async function findParent(role: string, messageId: string | undefined, conversationId: string) {
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
    } else if (currentNode.message.parentId) {
      const userMessage = (
        await db
          .select()
          .from(messages)
          .innerJoin(conversations, eq(messages.conversationId, conversations.id))
          .where(
            and(
              eq(messages.conversationId, conversationId),
              eq(messages.role, "user"),
              eq(messages.id, currentNode.message.parentId)
            )
          )
      ).at(0);

      if (userMessage) {
        return userMessage;
      }
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
    modelId = "mistral-medium-latest";
  } else if (apiKey.provider === AIProvider.OpenAI) {
    modelId = "gpt-3.5-turbo";
  } else if (apiKey.provider === AIProvider.Google) {
    modelId = "models/gemini-1.5-flash-latest";
  }

  const service = new AIService(apiKey.provider as AIProvider, apiKey.key);

  return service.generateConversationName(messages, modelId);
}
