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
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => new Date())
});

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  agents: many(agents)
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users)
}));

export const agentsRelations = relations(agents, ({ one }) => ({
  user: one(users)
}));
