import { relations, sql, type InferSelectModel } from "drizzle-orm";
import { integer, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";

export enum AIProvider {
  Mistral = "mistral",
  OpenAI = "openai",
  ElevenLabs = "elevenlabs"
}

export const users = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdate(() => new Date())
});

export const apiKeys = sqliteTable("apiKey", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().$type<AIProvider>(),
  key: text("key").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdate(() => new Date())
});

export const agents = sqliteTable("agent", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions").notNull(),
  lastUsedAt: integer("lastUsedAt", { mode: "timestamp_ms" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdate(() => new Date())
});

export const models = sqliteTable("model", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  tokenLimit: integer("tokenLimit").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdate(() => new Date())
});

export const conversations = sqliteTable("conversation", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  agentId: text("agentId").references(() => agents.id, { onDelete: "set null" }),
  modelId: text("modelId").references(() => models.id, {
    onDelete: "set null",
    onUpdate: "cascade"
  }),
  name: text("name").notNull(),
  currentNode: text("currentNode").references((): AnySQLiteColumn => messages.id, {
    onDelete: "set null"
  }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdate(() => new Date())
});

export const conversationUsers = sqliteTable("conversationUser", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  conversationId: text("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdate(() => new Date())
});

export const messages = sqliteTable("message", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  conversationId: text("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  role: text("role").notNull().$type<"user" | "assistant">(),
  parentId: text("parentId").references((): AnySQLiteColumn => messages.id, {
    onDelete: "cascade"
  }),
  isInternal: integer("isInternal", { mode: "boolean" })
    .notNull()
    .default(sql`false`),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdate(() => new Date())
});

export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  messages: many(messages),
  agent: one(agents, { fields: [conversations.agentId], references: [agents.id] }),
  model: one(models, { fields: [conversations.modelId], references: [models.id] }),
  conversationUsers: many(conversationUsers),
  currentNode: one(messages, {
    fields: [conversations.currentNode],
    references: [messages.id]
  })
}));

export const agentsRelations = relations(agents, ({ many, one }) => ({
  conversations: many(conversations),
  user: one(users, { fields: [agents.userId], references: [users.id] })
}));

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  conversationUsers: many(conversationUsers),
  messages: many(messages),
  agents: many(agents)
}));

export const modelsRelations = relations(models, ({ many }) => ({
  conversations: many(conversations)
}));

export const conversationUsersRelations = relations(conversationUsers, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationUsers.conversationId],
    references: [conversations.id]
  }),
  user: one(users, { fields: [conversationUsers.userId], references: [users.id] })
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
    relationName: "conversation"
  }),
  user: one(users, { fields: [messages.userId], references: [users.id] }),
  parent: one(messages, {
    fields: [messages.parentId],
    references: [messages.id],
    relationName: "parent"
  })
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] })
}));

export type Conversation = InferSelectModel<typeof conversations>;
export type ConversationWithMessages = Conversation & {
  messages: Array<InferSelectModel<typeof messages> & { childIds?: string[] }>;
};

export type Model = InferSelectModel<typeof models>;

export type Agent = InferSelectModel<typeof agents>;
