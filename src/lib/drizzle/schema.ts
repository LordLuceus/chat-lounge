import { relations, sql, type InferSelectModel } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  type AnySQLiteColumn
} from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";

export enum AIProvider {
  Mistral = "mistral",
  OpenAI = "openai",
  ElevenLabs = "elevenlabs",
  Google = "google",
  Anthropic = "anthropic"
}

export enum Visibility {
  Public = "public",
  Private = "private",
  Hidden = "hidden"
}

export enum AgentType {
  Default = "default",
  Character = "character"
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
  visibility: text("visibility")
    .notNull()
    .$type<Visibility>()
    .default(sql`'private'`),
  type: text("type")
    .notNull()
    .$type<AgentType>()
    .default(sql`'default'`),
  greeting: text("greeting"),
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
  isImporting: integer("isImporting", { mode: "boolean" })
    .notNull()
    .default(sql`0`),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdate(() => new Date())
});

export const conversationUsers = sqliteTable(
  "conversationUser",
  {
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
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.conversationId, table.userId] })
    };
  }
);

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

export const agentUsers = sqliteTable(
  "agentUser",
  {
    agentId: text("agentId")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastUsedAt: integer("lastUsedAt", { mode: "timestamp_ms" }),
    isOwner: integer("isOwner", { mode: "boolean" })
      .notNull()
      .default(sql`false`),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.agentId, table.userId] })
    };
  }
);

export const sharedConversations = sqliteTable("sharedConversation", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  conversationId: text("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  agentId: text("agentId").references(() => agents.id, { onDelete: "set null" }),
  sharedAt: integer("sharedAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdate(() => new Date())
});

export const sharedMessages = sqliteTable("sharedMessage", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  sharedConversationId: text("sharedConversationId")
    .notNull()
    .references(() => sharedConversations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  role: text("role").notNull().$type<"user" | "assistant">(),
  parentId: text("parentId").references((): AnySQLiteColumn => sharedMessages.id, {
    onDelete: "cascade"
  }),
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
  owner: one(users, { fields: [agents.userId], references: [users.id] }),
  agentUsers: many(agentUsers)
}));

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  conversationUsers: many(conversationUsers),
  messages: many(messages),
  agents: many(agents),
  agentUsers: many(agentUsers),
  sharedConversations: many(sharedConversations)
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

export const agentUsersRelations = relations(agentUsers, ({ one }) => ({
  agent: one(agents, { fields: [agentUsers.agentId], references: [agents.id] }),
  user: one(users, { fields: [agentUsers.userId], references: [users.id] })
}));

export const sharedConversationsRelations = relations(sharedConversations, ({ many, one }) => ({
  conversation: one(conversations, {
    fields: [sharedConversations.conversationId],
    references: [conversations.id]
  }),
  user: one(users, { fields: [sharedConversations.userId], references: [users.id] }),
  sharedMessages: many(sharedMessages),
  agent: one(agents, { fields: [sharedConversations.agentId], references: [agents.id] })
}));

export const sharedMessagesRelations = relations(sharedMessages, ({ one }) => ({
  sharedConversation: one(sharedConversations, {
    fields: [sharedMessages.sharedConversationId],
    references: [sharedConversations.id]
  }),
  parent: one(sharedMessages, {
    fields: [sharedMessages.parentId],
    references: [sharedMessages.id],
    relationName: "parent"
  })
}));

export type Conversation = InferSelectModel<typeof conversations>;
export type ConversationWithMessages = Conversation & {
  messages: Array<InferSelectModel<typeof messages> & { childIds?: string[] }>;
};

export type Model = InferSelectModel<typeof models>;

export type Agent = InferSelectModel<typeof agents>;

export type AgentWithUsage = Agent & {
  lastUsedAt: Date | null;
};

export type ApiKey = InferSelectModel<typeof apiKeys>;

export type User = InferSelectModel<typeof users>;

export type SharedConversation = InferSelectModel<typeof sharedConversations>;

export type SharedMessage = InferSelectModel<typeof sharedMessages>;
