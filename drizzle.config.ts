import dotenv from "dotenv";
import type { Config } from "drizzle-kit";

dotenv.config();

export default {
  out: "./src/lib/server/db",
  schema: "./src/lib/server/db/schema.ts",
  dbCredentials: {
    host: process.env.MARIADB_HOST!,
    port: Number(process.env.MARIADB_PORT!),
    user: process.env.MARIADB_USER!,
    password: process.env.MARIADB_PASSWORD!,
    database: process.env.MARIADB_DATABASE!
  },
  dialect: "mysql",
  strict: true,
  verbose: true
} satisfies Config;
