import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  driver: "turso",
  out: "./src/lib/drizzle",
  schema: "./src/lib/drizzle/schema.ts",
  dbCredentials: {
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_DB_AUTH_TOKEN!
  }
} satisfies Config;
