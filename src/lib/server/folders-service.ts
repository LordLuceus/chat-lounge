import { prisma } from "$lib/server/db";
import { createFullTextSearchCondition, getSearchQuery } from "$lib/server/search-helpers";
import { Prisma, type Folder } from "@prisma/client";

export type FolderWithScore = Folder & {
  searchScore?: number;
};

export async function getFolders(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  sortBy: string = "updatedAt",
  sortDirection: string = "DESC",
  search?: string
) {
  let orderByClause;

  switch (sortBy) {
    case "name":
      orderByClause = Prisma.sql`f.name ${Prisma.raw(sortDirection)}`;
      break;
    case "createdAt":
      orderByClause = Prisma.sql`f.createdAt ${Prisma.raw(sortDirection)}`;
      break;
    case "updatedAt":
    default:
      orderByClause = Prisma.sql`f.updatedAt ${Prisma.raw(sortDirection)}`;
      break;
  }

  const searchCondition = createFullTextSearchCondition(search, ["f.name"]);

  // Add score when searching
  const searchScoreSelect = search
    ? Prisma.sql`, MATCH(f.name) AGAINST(${getSearchQuery(search)} IN BOOLEAN MODE) AS searchScore`
    : Prisma.sql``;

  // Only order by score when both searching AND sortBy is "relevance"
  const orderBy = search && sortBy === "relevance" ? Prisma.sql`searchScore DESC` : orderByClause;

  const result = await prisma.$queryRaw<FolderWithScore[]>(
    Prisma.sql`
      SELECT DISTINCT f.id, f.userId, f.name, f.createdAt, f.updatedAt${searchScoreSelect}
      FROM folder f
      WHERE f.userId = ${userId}
      AND ${searchCondition}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `
  );

  const totalResult = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(DISTINCT f.id) AS count FROM folder f
      WHERE f.userId = ${userId}
      AND ${searchCondition}
    `
  );

  const total = Number(totalResult[0].count);

  return { folders: result, total };
}

export async function getFolder(userId: string, folderId: string) {
  const folder = await prisma.folder.findUniqueOrThrow({
    where: {
      id: folderId,
      userId
    }
  });

  return folder;
}

export async function createFolder({ userId, name }: Prisma.FolderUncheckedCreateInput) {
  const folder = await prisma.folder.create({
    data: {
      userId,
      name
    }
  });

  return folder;
}

export async function updateFolder(
  folderId: string,
  data: Prisma.FolderUpdateInput,
  userId?: string
) {
  return prisma.folder.update({
    where: { id: folderId, user: { id: userId } },
    data
  });
}

export async function deleteFolder(userId: string, folderId: string) {
  const deleteFolder = await prisma.folder.delete({
    where: { id: folderId, userId }
  });

  return deleteFolder;
}

export async function bulkDeleteFolders(userId: string, folderIds: string[]) {
  const folders = await prisma.folder.findMany({
    where: {
      id: { in: folderIds },
      userId
    }
  });

  if (folders.length !== folderIds.length) {
    throw new Error("One or more folders not found or access denied");
  }

  await prisma.conversation.updateMany({
    where: { folderId: { in: folderIds } },
    data: { folderId: null }
  });

  const result = await prisma.folder.deleteMany({
    where: {
      id: { in: folderIds },
      userId
    }
  });

  return { deleted: result.count };
}
