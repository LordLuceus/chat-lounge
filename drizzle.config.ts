import type { Config } from "drizzle-kit";

export default {
  out: "./src/lib/drizzle",
  schema: "./src/lib/drizzle/schema.ts",
  dbCredentials: {
    url: "file:data/chat-lounge.db"
  },
  dialect: "turso",
  strict: true,
  verbose: true
} satisfies Config;
