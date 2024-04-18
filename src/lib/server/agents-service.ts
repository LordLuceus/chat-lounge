import { db } from "$lib/drizzle/db";
import { agents } from "$lib/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";

export interface AgentCreateOptions {
  userId: string;
  name: string;
  description?: string;
  instructions: string;
}

export async function getAgents(userId: string) {
  return db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.lastUsedAt));
}

export async function getAgent(userId: string, agentId: string) {
  return db.query.agents.findFirst({
    where: and(eq(agents.userId, userId), eq(agents.id, agentId))
  });
}

export async function getAgentByName(userId: string, name: string) {
  return db.query.agents.findFirst({
    where: and(eq(agents.userId, userId), eq(agents.name, name))
  });
}

export async function getRecentAgents(userId: string) {
  return db
    .select()
    .from(agents)
    .where(eq(agents.userId, userId))
    .orderBy(desc(agents.lastUsedAt))
    .limit(5);
}

export async function createAgent({ userId, name, description, instructions }: AgentCreateOptions) {
  return db.insert(agents).values({ userId, name, description, instructions }).returning();
}

export async function updateAgent(
  agentId: string,
  data: Partial<AgentCreateOptions>,
  userId?: string
) {
  if (userId) {
    const agent = await getAgent(userId, agentId);

    if (!agent) {
      throw new Error("Agent not found");
    }
  }
  return db.update(agents).set(data).where(eq(agents.id, agentId)).returning();
}

export async function updateLastUsed(userId: string, agentId: string) {
  return db
    .update(agents)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(agents.userId, userId), eq(agents.id, agentId)));
}

export async function deleteAgent(userId: string, agentId: string) {
  return db.delete(agents).where(and(eq(agents.userId, userId), eq(agents.id, agentId)));
}
