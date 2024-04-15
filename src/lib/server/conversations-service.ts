import { OPENAI_API_KEY } from "$env/static/private";
import { db } from "$lib/drizzle/db";
import { conversationUsers, conversations, messages } from "$lib/drizzle/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { OpenAI } from "openai";

export interface ConversationCreateOptions {
  name?: string;
  agentId: string | null;
  modelId: string | null;
  userId: string;
  messages: { role: string; content: string }[];
  updatedAt?: Date;
}

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

  return db.query.conversations.findFirst({
    with: { messages: true },
    where: eq(conversations.id, conversationId),
    orderBy: [asc(messages.createdAt)]
  });
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
      .values({ name: name ? name : "Untitled", agentId, modelId })
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
  data: Partial<ConversationCreateOptions>
) {
  return (
    await db.update(conversations).set(data).where(eq(conversations.id, conversationId)).returning()
  ).at(0);
}

export async function deleteConversation(userId: string, conversationId: string) {
  return db
    .delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversationUsers.userId, userId)));
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
  role: string,
  userId?: string
) {
  await db.insert(messages).values({ conversationId, userId, content, role }).returning();

  // Check if the user is already a member of the conversation
  if (userId) {
    const user = await db.query.conversationUsers.findFirst({
      where: and(
        eq(conversationUsers.conversationId, conversationId),
        eq(conversationUsers.userId, userId)
      )
    });

    // If the user is not a member of the conversation, add them
    if (!user) {
      await addConversationUser(conversationId, userId);
    }
  }

  await updateConversation(conversationId, { updatedAt: new Date() });
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
  data: { content: string }
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
  const context = messages.map(({ role, content }) => `${role}: ${content}`).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content:
          "Generate a brief and impactful title for the following conversation between a user and an AI assistant. Respond only with the title for the conversation and nothing else. Do not wrap the text in quotation marks. I need only the title and nothing else.\n\n---\n\n" +
          context
      }
    ]
  });

  return response.choices[0].message.content;
}
