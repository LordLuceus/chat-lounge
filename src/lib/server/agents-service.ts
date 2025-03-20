import { agentUsers, agents, db } from "$lib/server/db";
import { AgentType, Visibility } from "$lib/types/db";
import { and, eq, or, sql } from "drizzle-orm";

export interface AgentCreateOptions {
  userId: string;
  name: string;
  description?: string;
  instructions: string;
  visibility: Visibility;
  type: AgentType;
  greeting?: string | null;
}

export async function getAgents(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  sortBy: string = "agentUser.lastUsedAt DESC",
  search?: string,
  visibility: Visibility | null = null,
  ownerOnly: boolean = false,
  usedOnly: boolean = true
) {
  const result = await db
    .selectDistinct({
      id: agents.id,
      userId: agents.userId,
      name: agents.name,
      description: agents.description,
      instructions: agents.instructions,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
      lastUsedAt: agentUsers.lastUsedAt
    })
    .from(agents)
    .leftJoin(agentUsers, and(eq(agents.id, agentUsers.agentId), eq(agentUsers.userId, userId)))
    .where(
      sql`(${ownerOnly ? sql`${agentUsers.userId} = ${userId} AND ${agentUsers.isOwner}` : sql`${agentUsers.userId} IS NULL OR ${agentUsers.userId} = ${userId}`}) ${usedOnly ? sql`AND (${agentUsers.userId} IS NOT NULL)` : undefined} AND (${visibility} IS NULL OR ${agents.visibility} = ${visibility}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
    )
    .orderBy(sql`${sql.raw(sortBy)}`)
    .limit(limit)
    .offset(offset);

  const total = (
    await db
      .selectDistinct({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(agents)
      .leftJoin(agentUsers, and(eq(agents.id, agentUsers.agentId), eq(agentUsers.userId, userId)))
      .where(
        sql`(${ownerOnly ? sql`${agentUsers.userId} = ${userId} AND ${agentUsers.isOwner}` : sql`${agentUsers.userId} IS NULL OR ${agentUsers.userId} = ${userId}`}) ${usedOnly ? sql`AND (${agentUsers.userId} IS NOT NULL)` : undefined} AND (${visibility} IS NULL OR ${agents.visibility} = ${visibility}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
      )
  ).at(0);

  return { agents: result, total: total?.count };
}

export async function getAgent(userId: string, agentId: string) {
  return (
    await db
      .select({
        id: agents.id,
        userId: agents.userId,
        name: agents.name,
        description: agents.description,
        instructions: agents.instructions,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
        lastUsedAt: agentUsers.lastUsedAt,
        visibility: agents.visibility,
        type: agents.type,
        greeting: agents.greeting
      })
      .from(agents)
      .innerJoin(agentUsers, eq(agents.id, agentUsers.agentId))
      .where(
        and(
          eq(agents.id, agentId),
          or(
            eq(agentUsers.userId, userId),
            eq(agents.visibility, Visibility.Public),
            eq(agents.visibility, Visibility.Hidden)
          )
        )
      )
  ).at(0);
}

export async function createAgent({
  userId,
  name,
  description,
  instructions,
  visibility,
  type,
  greeting
}: AgentCreateOptions) {
  const result = await db
    .insert(agents)
    .values({ userId, name, description, instructions, visibility, type, greeting })
    .$returningId();
  if (!result[0]?.id) {
    throw new Error("Failed to create agent");
  }

  const { id: agentId } = result[0];

  await addAgentUser(agentId, userId, true);

  return agentId;
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
  return db.update(agents).set(data).where(eq(agents.id, agentId));
}

export async function updateLastUsed(userId: string, agentId: string) {
  const agentUser = await db.query.agentUsers.findFirst({
    where: and(eq(agentUsers.userId, userId), eq(agentUsers.agentId, agentId))
  });

  if (!agentUser) {
    await addAgentUser(agentId, userId, false);
  }

  return db
    .update(agentUsers)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(agentUsers.userId, userId), eq(agentUsers.agentId, agentId)));
}

export async function deleteAgent(userId: string, agentId: string) {
  return db.delete(agents).where(and(eq(agents.userId, userId), eq(agents.id, agentId)));
}

export async function addAgentUser(agentId: string, userId: string, isOwner: boolean) {
  return db.insert(agentUsers).values({ agentId, userId, isOwner });
}
