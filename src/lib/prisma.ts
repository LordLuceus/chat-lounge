import { dev } from "$app/environment";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { POSTGRES_PRISMA_URL } from "$env/static/private";

neonConfig.webSocketConstructor = ws;
let prisma: PrismaClient;

if (dev) {
  prisma = new PrismaClient();
} else {
  const neon = new Pool({ connectionString: POSTGRES_PRISMA_URL });
  const adapter = new PrismaNeon(neon);
  prisma = new PrismaClient({ adapter });
}

export default prisma;
