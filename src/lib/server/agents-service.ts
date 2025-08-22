import { prisma } from "$lib/server/db";
import { AgentType, AgentVerbosity, Visibility } from "$lib/types/db";
import { Prisma, type Agent } from "@prisma/client";

export interface AgentCreateOptions {
  userId: string;
  name: string;
  description?: string;
  instructions: string;
  visibility: Visibility;
  type: AgentType;
  verbosity?: AgentVerbosity | null;
  greeting?: string | null;
  preferredModelId?: string | null;
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
             a.createdAt, a.updatedAt, a.visibility, a.type, a.verbosity, a.greeting, au.lastUsedAt 
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
      verbosity: true,
      greeting: true,
      preferredModelId: true,
      preferredModel: {
        select: {
          id: true,
          name: true,
          provider: true
        }
      },
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
  verbosity,
  greeting,
  preferredModelId
}: AgentCreateOptions) {
  const result = await prisma.agent.create({
    data: {
      userId,
      name,
      description,
      instructions,
      visibility,
      type,
      verbosity,
      greeting,
      preferredModelId
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

export async function bulkDeleteAgents(userId: string, agentIds: string[]) {
  const agents = await prisma.agent.findMany({
    where: {
      id: { in: agentIds },
      userId
    }
  });

  if (agents.length !== agentIds.length) {
    throw new Error("One or more agents not found or access denied");
  }

  const result = await prisma.agent.deleteMany({
    where: {
      id: { in: agentIds },
      userId
    }
  });

  return { deleted: result.count };
}

export async function forkAgent(userId: string, sourceAgentId: string, newName?: string) {
  const sourceAgent = await prisma.agent.findFirst({
    where: {
      id: sourceAgentId,
      visibility: Visibility.Public
    }
  });

  if (!sourceAgent) {
    throw new Error("Source agent not found or not public");
  }

  const forkName = newName || `Copy of ${sourceAgent.name}`;

  const forkedAgent = await prisma.agent.create({
    data: {
      userId,
      name: forkName,
      description: sourceAgent.description,
      instructions: sourceAgent.instructions,
      visibility: Visibility.Private,
      type: sourceAgent.type,
      verbosity: sourceAgent.verbosity,
      greeting: sourceAgent.greeting,
      preferredModelId: sourceAgent.preferredModelId
    }
  });

  await addAgentUser(forkedAgent.id, userId, true);

  return forkedAgent;
}
