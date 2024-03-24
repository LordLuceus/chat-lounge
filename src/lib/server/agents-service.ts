import { db } from "$lib/drizzle/db";
import { agents } from "$lib/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";

export async function getAgents(userId: string) {
  return db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.updatedAt));
}

export async function getAgent(userId: string, agentId: string) {
  return (
    await db
      .select()
      .from(agents)
      .where(and(eq(agents.userId, userId), eq(agents.id, agentId)))
  ).at(0);
}
