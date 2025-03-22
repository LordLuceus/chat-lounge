import { agentUsers, agents, db, prisma } from "$lib/server/db";
import { AgentType, Visibility } from "$lib/types/db";
import type { Agent } from "@prisma/client";
import { and, eq, sql } from "drizzle-orm";

export interface AgentCreateOptions {
  userId: string;
  name: string;
  description?: string;
  instructions: string;
  visibility: Visibility;
  type: AgentType;
  greeting?: string | null;
}

export type AgentWithUsage = Agent & {
  lastUsedAt: Date | null;
};

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
  const agent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      OR: [
        {
          agentUsers: {
            some: {
              userId
            }
          }
        },
        { visibility: Visibility.Public },
        { visibility: Visibility.Hidden }
      ]
    },
    select: {
      id: true,
      userId: true,
      name: true,
      description: true,
      instructions: true,
      createdAt: true,
      updatedAt: true,
      visibility: true,
      type: true,
      greeting: true,
      agentUsers: {
        where: {
          userId
        },
        select: {
          lastUsedAt: true
        },
        take: 1
      }
    }
  });

  const result = agent
    ? {
        ...agent,
        lastUsedAt: agent.agentUsers[0]?.lastUsedAt,
        agentUsers: undefined // Remove the agentUsers array from the result
      }
    : null;

  return result;
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
  const result = await prisma.agent.create({
    data: {
      userId,
      name,
      description,
      instructions,
      visibility,
      type,
      greeting
    }
  });

  const { id: agentId } = result;

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
  return prisma.agent.update({
    where: { id: agentId },
    data
  });
}

export async function updateLastUsed(userId: string, agentId: string) {
  const agentUser = await prisma.agentUser.findFirst({
    where: {
      userId,
      agentId
    }
  });

  if (!agentUser) {
    await addAgentUser(agentId, userId, false);
  }

  return prisma.agentUser.update({
    where: {
      agentId_userId: {
        agentId,
        userId
      }
    },
    data: {
      lastUsedAt: new Date()
    }
  });
}

export async function deleteAgent(userId: string, agentId: string) {
  return prisma.agent.delete({
    where: {
      userId,
      id: agentId
    }
  });
}

export async function addAgentUser(agentId: string, userId: string, isOwner: boolean) {
  return prisma.agentUser.create({
    data: {
      agentId,
      userId,
      isOwner
    }
  });
}
