import { db } from "$lib/drizzle/db";
import { agents } from "$lib/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";

interface AgentSaveOptions {
  userId: string;
  name: string;
  description?: string;
  instructions: string;
}

export async function getAgents(userId: string) {
  return db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.updatedAt));
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

export async function saveAgent({ userId, name, description, instructions }: AgentSaveOptions) {
  const existingAgent = await getAgentByName(userId, name);

  if (existingAgent) {
    return db
      .update(agents)
      .set({ name, description, instructions })
      .where(eq(agents.id, existingAgent.id));
  }

  return db.insert(agents).values({ userId, name, description, instructions });
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
