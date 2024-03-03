import { dev } from "$app/environment";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";
import { POSTGRES_PRISMA_URL } from "$env/static/private";

neonConfig.webSocketConstructor = ws;
const connectionString = POSTGRES_PRISMA_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

const prisma = dev ? new PrismaClient() : new PrismaClient({ adapter });

export default prisma;
