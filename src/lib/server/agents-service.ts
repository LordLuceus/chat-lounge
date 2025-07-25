import { prisma } from "$lib/server/db";
import { AgentType, Visibility } from "$lib/types/db";
import { Prisma, type Agent } from "@prisma/client";

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
  sortBy: string = "lastUsedAt",
  sortDirection: string = "DESC",
  search?: string,
  visibility: Visibility | null = null,
  ownerOnly: boolean = false
) {
  let orderByClause;

  switch (sortBy) {
    case "name":
      orderByClause = Prisma.sql`a.name ${Prisma.raw(sortDirection)}`;
      break;
    case "createdAt":
      orderByClause = Prisma.sql`a.createdAt ${Prisma.raw(sortDirection)}`;
      break;
    case "updatedAt":
      orderByClause = Prisma.sql`a.updatedAt ${Prisma.raw(sortDirection)}`;
      break;
    case "lastUsedAt":
    default:
      orderByClause = Prisma.sql`au.lastUsedAt ${Prisma.raw(sortDirection)}`;
      break;
  }

  const result = await prisma.$queryRaw<AgentWithUsage[]>(
    Prisma.sql`
      SELECT DISTINCT a.id, a.userId, a.name, a.description, a.instructions, 
             a.createdAt, a.updatedAt, a.visibility, a.type, a.greeting, au.lastUsedAt 
      FROM agent a 
      LEFT JOIN agentUser au on (a.id = au.agentId AND au.userId = ${userId})
      WHERE ${ownerOnly ? Prisma.sql`(au.userId = ${userId} AND au.isOwner = true)` : Prisma.sql`(au.userId = ${userId} OR ${visibility} = ${Visibility.Public})`}
        AND ${visibility ? Prisma.sql`a.visibility = ${visibility}` : Prisma.sql`true`} 
        AND ${
          search
            ? Prisma.sql`(
          MATCH(a.name, a.description) AGAINST(${'"' + search + '"'} IN BOOLEAN MODE) OR
          MATCH(a.name, a.description) AGAINST(${"*" + search.split(" ").join("* *") + "*"} IN BOOLEAN MODE)
        )`
            : Prisma.sql`true`
        } 
      ORDER BY ${orderByClause}
      LIMIT ${limit} OFFSET ${offset}
    `
  );

  const totalResult = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(DISTINCT a.id) AS count FROM agent a 
      LEFT JOIN agentUser au on (a.id = au.agentId AND au.userId = ${userId})
      WHERE ${ownerOnly ? Prisma.sql`(au.userId = ${userId} AND au.isOwner = true)` : Prisma.sql`(au.userId = ${userId} OR ${visibility} = ${Visibility.Public})`}
        AND ${visibility ? Prisma.sql`a.visibility = ${visibility}` : Prisma.sql`true`} 
        AND ${
          search
            ? Prisma.sql`(
          MATCH(a.name, a.description) AGAINST(${'"' + search + '"'} IN BOOLEAN MODE) OR
          MATCH(a.name, a.description) AGAINST(${"*" + search.split(" ").join("* *") + "*"} IN BOOLEAN MODE)
        )`
            : Prisma.sql`true`
        } 
    `
  );

  const total = Number(totalResult[0].count);

  return { agents: result, total };
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

export async function getAgentByName(
  userId: string,
  name: string,
  visibility: Visibility | null = null
) {
  return prisma.agent.findFirst({
    where: {
      name,
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
      ],
      ...(visibility ? { visibility } : {})
    }
  });
}
