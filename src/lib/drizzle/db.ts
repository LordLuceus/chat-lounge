import { TURSO_DB_AUTH_TOKEN, TURSO_DB_URL } from "$env/static/private";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: "file:data/chat-lounge.db",
  syncUrl: TURSO_DB_URL,
  authToken: TURSO_DB_AUTH_TOKEN,
  syncInterval: 300
});
export const db = drizzle(client, { schema });
