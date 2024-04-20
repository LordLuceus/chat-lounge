import { OPENAI_API_KEY } from "$env/static/private";
import { db } from "$lib/drizzle/db";
import {
  conversationUsers,
  conversations,
  messages,
  type ConversationWithMessages
} from "$lib/drizzle/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { OpenAI } from "openai";

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

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function getConversations(userId: string) {
  return db
    .select()
    .from(conversations)
    .innerJoin(conversationUsers, eq(conversations.id, conversationUsers.conversationId))
    .where(eq(conversationUsers.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversation(userId: string, conversationId: string) {
  const users = await getConversationUsers(conversationId);

  if (!users.find((user) => user.userId === userId)) {
    throw new Error("User is not a member of the conversation");
  }

  const conversation: ConversationWithMessages | undefined = await db.query.conversations.findFirst(
    {
      with: {
        messages: true
      },
      where: eq(conversations.id, conversationId),
      orderBy: [asc(messages.createdAt)]
    }
  );

  if (!conversation) throw new Error("Conversation not found");

  const messagesWithChildIds = conversation.messages.map((message) => ({
    ...message,
    childIds: conversation.messages.filter((m) => m.parentId === message.id).map((m) => m.id)
  }));

  conversation.messages = messagesWithChildIds;

  const messageMap = createMessageMap(messagesWithChildIds);

  (conversation as ConversationWithMessageMap).messageMap = messageMap;

  return conversation as ConversationWithMessageMap;
}

export async function getRecentConversations(userId: string) {
  return db
    .select()
    .from(conversations)
    .innerJoin(conversationUsers, eq(conversations.id, conversationUsers.conversationId))
    .where(eq(conversationUsers.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(5);
}

export async function createConversation({
  name,
  agentId,
  modelId,
  userId,
  messages
}: ConversationCreateOptions) {
  let conversation = (
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

  const title = await generateConversationName(messages);
  if (title) conversation = await updateConversation(conversation.id, { name: title });

  return conversation;
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
  messageId?: string
) {
  const message = (
    await db.insert(messages).values({ conversationId, userId, content, role }).returning()
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

  await updateConversation(conversationId, { currentNode: message.id });
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

async function generateConversationName(messages: { role: string; content: string }[]) {
  const prompt =
    "Summarise the following conversation in five words or fewer. Be as concise as possible without losing the context of the conversation. Your goal is to extract the key point of the conversation and turn it into a short and interesting title. Respond only with the title and nothing else.";

  const context = messages.map(({ role, content }) => `${role}: ${content}`).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: prompt + "\n\n---\n\n" + context
      }
    ]
  });

  return response.choices[0].message.content?.trim().replaceAll('"', "");
}

function createMessageMap(messages: Message[]): Record<string, Message> {
  return messages.reduce<Record<string, Message>>((obj, message) => {
    obj[message.id] = message;
    return obj;
  }, {});
}
