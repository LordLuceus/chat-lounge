import { relations, sql, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  int,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
  type AnyMySqlColumn
} from "drizzle-orm/mysql-core";
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

export const users = mysqlTable("user", {
  id: varchar("id", { length: 100 }).notNull().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }),
  image: text("image"),
  createdAt: timestamp("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
});

export const apiKeys = mysqlTable("apiKey", {
  id: varchar("id", { length: 36 })
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  userId: varchar("userId", { length: 100 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull().$type<AIProvider>(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
});

export const agents = mysqlTable("agent", {
  id: varchar("id", { length: 36 })
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  userId: varchar("userId", { length: 100 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  instructions: text("instructions").notNull(),
  visibility: varchar("visibility", { length: 20 })
    .notNull()
    .$type<Visibility>()
    .default(sql`'private'`),
  type: varchar("type", { length: 20 })
    .notNull()
    .$type<AgentType>()
    .default(sql`'default'`),
  greeting: text("greeting"),
  createdAt: timestamp("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
});

export const models = mysqlTable("model", {
  id: varchar("id", { length: 100 }).notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  tokenLimit: int("tokenLimit").notNull(),
  createdAt: timestamp("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
});

export const conversations = mysqlTable("conversation", {
  id: varchar("id", { length: 36 })
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  agentId: varchar("agentId", { length: 36 }).references(() => agents.id, { onDelete: "set null" }),
  modelId: varchar("modelId", { length: 100 }).references(() => models.id, {
    onDelete: "set null",
    onUpdate: "cascade"
  }),
  name: varchar("name", { length: 255 }).notNull(),
  currentNode: varchar("currentNode", { length: 36 }).references(
    (): AnyMySqlColumn => messages.id,
    {
      onDelete: "set null"
    }
  ),
  isImporting: boolean("isImporting")
    .notNull()
    .default(sql`false`),
  isPinned: boolean("isPinned")
    .notNull()
    .default(sql`false`),
  folderId: varchar("folderId", { length: 36 }).references(() => folders.id, {
    onDelete: "set null"
  }),
  createdAt: timestamp("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
});

export const conversationUsers = mysqlTable(
  "conversationUser",
  {
    conversationId: varchar("conversationId", { length: 36 })
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: varchar("userId", { length: 100 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updatedAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.conversationId, table.userId] })
    };
  }
);

export const messages = mysqlTable("message", {
  id: varchar("id", { length: 36 })
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  conversationId: varchar("conversationId", { length: 36 })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: varchar("userId", { length: 100 }).references(() => users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  role: varchar("role", { length: 20 }).notNull().$type<"user" | "assistant">(),
  parentId: varchar("parentId", { length: 36 }).references((): AnyMySqlColumn => messages.id, {
    onDelete: "cascade"
  }),
  isInternal: boolean("isInternal")
    .notNull()
    .default(sql`false`),
  createdAt: timestamp("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
});

export const agentUsers = mysqlTable(
  "agentUser",
  {
    agentId: varchar("agentId", { length: 36 })
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    userId: varchar("userId", { length: 100 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastUsedAt: timestamp("lastUsedAt"),
    isOwner: boolean("isOwner")
      .notNull()
      .default(sql`false`),
    createdAt: timestamp("createdAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updatedAt")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.agentId, table.userId] })
    };
  }
);

export const sharedConversations = mysqlTable("sharedConversation", {
  id: varchar("id", { length: 36 })
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  userId: varchar("userId", { length: 100 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  conversationId: varchar("conversationId", { length: 36 })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  agentId: varchar("agentId", { length: 36 }).references(() => agents.id, { onDelete: "set null" }),
  sharedAt: timestamp("sharedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
});

export const sharedMessages = mysqlTable("sharedMessage", {
  id: varchar("id", { length: 36 })
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  sharedConversationId: varchar("sharedConversationId", { length: 36 })
    .notNull()
    .references(() => sharedConversations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  role: varchar("role", { length: 20 }).notNull().$type<"user" | "assistant">(),
  parentId: varchar("parentId", { length: 36 }).references(
    (): AnyMySqlColumn => sharedMessages.id,
    {
      onDelete: "cascade"
    }
  ),
  createdAt: timestamp("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
});

export const folders = mysqlTable("folder", {
  id: varchar("id", { length: 36 })
    .notNull()
    .primaryKey()
    .$default(() => uuidv4()),
  name: varchar("name", { length: 255 }).notNull(),
  userId: varchar("userId", { length: 100 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
});

export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  messages: many(messages),
  agent: one(agents, { fields: [conversations.agentId], references: [agents.id] }),
  model: one(models, { fields: [conversations.modelId], references: [models.id] }),
  conversationUsers: many(conversationUsers),
  currentNode: one(messages, {
    fields: [conversations.currentNode],
    references: [messages.id]
  }),
  folder: one(folders, { fields: [conversations.folderId], references: [folders.id] })
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
  sharedConversations: many(sharedConversations),
  folders: many(folders)
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

export const foldersRelations = relations(folders, ({ many, one }) => ({
  conversations: many(conversations),
  user: one(users, { fields: [folders.userId], references: [users.id] })
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

export type Folder = InferSelectModel<typeof folders>;
