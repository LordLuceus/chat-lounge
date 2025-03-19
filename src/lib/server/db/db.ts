import { env } from "$env/dynamic/private";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const client = await mysql.createConnection({
  host: env.MARIADB_HOST,
  port: Number(env.MARIADB_PORT),
  user: env.MARIADB_USER,
  password: env.MARIADB_PASSWORD,
  database: env.MARIADB_DATABASE
});
export const db = drizzle({ client, schema, mode: "default" });
