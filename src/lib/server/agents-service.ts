import { db } from "$lib/drizzle/db";
import { agents } from "$lib/drizzle/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export interface AgentCreateOptions {
  userId: string;
  name: string;
  description?: string;
  instructions: string;
}

export async function getAgents(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  sortBy: string = "agent.lastUsedAt DESC",
  search?: string
) {
  const result = await db
    .select({
      id: agents.id,
      userId: agents.userId,
      name: agents.name,
      description: agents.description,
      instructions: agents.instructions,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
      lastUsedAt: agents.lastUsedAt
    })
    .from(agents)
    .where(search ? sql`${sql.raw(search)}` : undefined)
    .orderBy(sql`${sql.raw(sortBy)}`)
    .limit(limit)
    .offset(offset);

  const total = (
    await db
      .select({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(agents)
      .where(search ? sql`${sql.raw(search)}` : undefined)
  ).at(0);

  return { agents: result, total: total?.count };
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
