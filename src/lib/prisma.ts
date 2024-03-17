import { dev } from "$app/environment";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import { POSTGRES_PRISMA_URL } from "$env/static/private";

let prisma: PrismaClient;

if (dev) {
  prisma = new PrismaClient();
} else {
  const neon = new Pool({ connectionString: POSTGRES_PRISMA_URL });
  const adapter = new PrismaNeon(neon);
  prisma = new PrismaClient({ adapter });
}

export default prisma;
