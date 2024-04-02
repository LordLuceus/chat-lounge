import { createClient } from "@libsql/client";
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

export const runMigrations = async () => {
  const client = createClient({
    // @ts-expect-error - TS complains about env vars not being defined
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_AUTH_TOKEN
  });
  const db = drizzle(client);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "src/lib/drizzle" });
  console.log("Migrations complete.");
};

runMigrations();
