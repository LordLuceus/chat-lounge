import dotenv from "dotenv";
import type { Config } from "drizzle-kit";

dotenv.config();

export default {
  out: "./src/lib/server/db",
  schema: "./src/lib/server/db/schema.ts",
  dbCredentials: {
    host: process.env.MYSQL_HOST!,
    port: Number(process.env.MYSQL_PORT!),
    user: process.env.MYSQL_USER!,
    password: process.env.MYSQL_PASSWORD!,
    database: process.env.MYSQL_DATABASE!
  },
  dialect: "mysql",
  strict: true,
  verbose: true
} satisfies Config;
