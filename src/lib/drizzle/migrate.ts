import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./db";

export const runMigrations = async () => {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "src/lib/drizzle" });
  console.log("Migrations complete.");
};

runMigrations();
