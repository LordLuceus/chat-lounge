import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
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
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
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
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => new Date())
});

export const models = sqliteTable("model", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  tokenLimit: integer("tokenLimit").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
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
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
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
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
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
  text: text("text").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => new Date())
});

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages)
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  conversations: many(conversations)
}));

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  conversationUsers: many(conversationUsers),
  messages: many(messages)
}));

export const modelsRelations = relations(models, ({ many }) => ({
  conversations: many(conversations)
}));

export const conversationUsersRelations = relations(conversationUsers, ({ one }) => ({
  conversation: one(conversations),
  user: one(users)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations),
  user: one(users)
}));
