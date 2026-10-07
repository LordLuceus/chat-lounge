import { prisma } from "$lib/server/db";
import { ModelReviewStatus, Prisma } from "@prisma/client";

export const ANALYTICS_RANGES = {
  "7": { label: "Last 7 days", days: 7 },
  "30": { label: "Last 30 days", days: 30 },
  "90": { label: "Last 90 days", days: 90 },
  all: { label: "All time", days: null }
} as const;

export type AnalyticsRange = keyof typeof ANALYTICS_RANGES;

export function parseAnalyticsRange(value: string | null): AnalyticsRange {
  return value && value in ANALYTICS_RANGES ? (value as AnalyticsRange) : "30";
}

function rangeStart(range: AnalyticsRange) {
  const { days } = ANALYTICS_RANGES[range];
  return days === null ? null : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Conversation counts per model, per user, and per user and model, for
 * conversations created in the given range. A conversation shared by several
 * users counts once for each of them in the per-user figures.
 */
export async function getConversationAnalytics(range: AnalyticsRange) {
  const since = rangeStart(range);
  const createdFilter = since ? Prisma.sql`AND c.createdAt >= ${since}` : Prisma.empty;
  const messageFilter = since ? Prisma.sql`AND m.createdAt >= ${since}` : Prisma.empty;

  const [totals, perModel, messagesPerModel, perUser, perUserModel] = await Promise.all([
    prisma.$queryRaw<{ conversations: bigint; users: bigint; messages: bigint }[]>`
      SELECT
        (SELECT COUNT(*) FROM conversation c WHERE 1 = 1 ${createdFilter}) AS conversations,
        (SELECT COUNT(DISTINCT cu.userId) FROM conversationUser cu
          JOIN conversation c ON c.id = cu.conversationId WHERE 1 = 1 ${createdFilter}) AS users,
        (SELECT COUNT(*) FROM message m WHERE m.isInternal = false ${messageFilter}) AS messages`,
    prisma.$queryRaw<
      { modelId: string | null; name: string | null; provider: string | null; count: bigint }[]
    >`
      SELECT c.modelId, mo.name, mo.provider, COUNT(*) AS count
      FROM conversation c
      LEFT JOIN model mo ON mo.id = c.modelId
      WHERE 1 = 1 ${createdFilter}
      GROUP BY c.modelId, mo.name, mo.provider
      ORDER BY count DESC`,
    prisma.$queryRaw<{ modelId: string; count: bigint }[]>`
      SELECT m.modelId, COUNT(*) AS count
      FROM message m
      WHERE m.role = 'assistant' AND m.isInternal = false AND m.modelId IS NOT NULL ${messageFilter}
      GROUP BY m.modelId`,
    prisma.$queryRaw<{ userId: string; username: string; count: bigint }[]>`
      SELECT cu.userId, u.username, COUNT(*) AS count
      FROM conversationUser cu
      JOIN conversation c ON c.id = cu.conversationId
      JOIN \`user\` u ON u.id = cu.userId
      WHERE 1 = 1 ${createdFilter}
      GROUP BY cu.userId, u.username
      ORDER BY count DESC`,
    prisma.$queryRaw<
      { userId: string; modelId: string | null; name: string | null; count: bigint }[]
    >`
      SELECT cu.userId, c.modelId, mo.name, COUNT(*) AS count
      FROM conversationUser cu
      JOIN conversation c ON c.id = cu.conversationId
      LEFT JOIN model mo ON mo.id = c.modelId
      WHERE 1 = 1 ${createdFilter}
      GROUP BY cu.userId, c.modelId, mo.name
      ORDER BY count DESC`
  ]);

  const replies = new Map(messagesPerModel.map((row) => [row.modelId, Number(row.count)]));

  const modelsByUser = new Map<string, { modelId: string | null; name: string; count: number }[]>();
  for (const row of perUserModel) {
    const list = modelsByUser.get(row.userId) ?? [];
    list.push({ modelId: row.modelId, name: row.name ?? "No model", count: Number(row.count) });
    modelsByUser.set(row.userId, list);
  }

  return {
    totals: {
      conversations: Number(totals[0]?.conversations ?? 0),
      users: Number(totals[0]?.users ?? 0),
      messages: Number(totals[0]?.messages ?? 0)
    },
    perModel: perModel.map((row) => ({
      modelId: row.modelId,
      name: row.name ?? (row.modelId ? row.modelId : "No model"),
      provider: row.provider,
      conversations: Number(row.count),
      replies: row.modelId ? (replies.get(row.modelId) ?? 0) : 0
    })),
    perUser: perUser.map((row) => ({
      userId: row.userId,
      username: row.username,
      conversations: Number(row.count),
      models: modelsByUser.get(row.userId) ?? []
    }))
  };
}

export async function getAdminUsers(search?: string) {
  const users = await prisma.user.findMany({
    where: search
      ? { OR: [{ username: { contains: search } }, { email: { contains: search } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { conversationUsers: true, messages: true, agents: true } }
    }
  });

  const lastActive = await prisma.message.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) } },
    _max: { createdAt: true }
  });
  const lastActiveByUser = new Map(lastActive.map((row) => [row.userId, row._max.createdAt]));

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    lastActiveAt: lastActiveByUser.get(user.id) ?? null,
    conversations: user._count.conversationUsers,
    messages: user._count.messages,
    agents: user._count.agents
  }));
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  return prisma.user.update({ where: { id: userId }, data: { isAdmin } });
}

export async function getApprovedModelsWithUsage() {
  const models = await prisma.model.findMany({
    where: { reviewStatus: ModelReviewStatus.approved },
    orderBy: [
      { provider: "asc" },
      { releaseDate: { sort: "desc", nulls: "last" } },
      { name: "asc" }
    ],
    include: { _count: { select: { conversations: true, agents: true } } }
  });

  return models.map(({ _count, ...model }) => ({
    ...model,
    conversations: _count.conversations,
    agents: _count.agents
  }));
}

export async function setModelDeprecated(id: string, deprecated: boolean) {
  return prisma.model.update({ where: { id }, data: { deprecated } });
}

export const ADMIN_CONVERSATIONS_PAGE_SIZE = 50;

/**
 * Conversation metadata across all users. Message content is deliberately
 * left out; admins see who, which model and how much, not what was said.
 */
export async function getAdminConversations(options: {
  page: number;
  userId?: string;
  modelId?: string;
  search?: string;
}) {
  const where: Prisma.ConversationWhereInput = {
    conversationUsers: options.userId ? { some: { userId: options.userId } } : undefined,
    // "none" selects conversations without a model.
    modelId: options.modelId === "none" ? null : options.modelId,
    name: options.search ? { contains: options.search } : undefined
  };

  const [total, conversations] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (options.page - 1) * ADMIN_CONVERSATIONS_PAGE_SIZE,
      take: ADMIN_CONVERSATIONS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        isImporting: true,
        model: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
        conversationUsers: { select: { user: { select: { id: true, username: true } } } },
        _count: { select: { messages: { where: { isInternal: false } } } }
      }
    })
  ]);

  return {
    total,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_CONVERSATIONS_PAGE_SIZE)),
    conversations: conversations.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      isImporting: c.isImporting,
      model: c.model,
      agent: c.agent,
      users: c.conversationUsers.map((cu) => cu.user),
      messages: c._count.messages
    }))
  };
}

export async function getAdminFilterOptions() {
  const [users, models] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } }),
    prisma.model.findMany({
      where: { conversations: { some: {} } },
      select: { id: true, name: true, provider: true },
      orderBy: { name: "asc" }
    })
  ]);

  return { users, models };
}
