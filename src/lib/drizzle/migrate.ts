import { createClient } from "@libsql/client";
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

export const runMigrations = async () => {
  const client = createClient({
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_DB_AUTH_TOKEN
  });
  const db = drizzle(client, { schema });

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "src/lib/drizzle" });
  console.log("Migrations complete.");
};

runMigrations();
