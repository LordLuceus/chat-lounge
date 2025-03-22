import { db, folders, prisma } from "$lib/server/db";
import { Prisma } from "@prisma/client";
import { sql } from "drizzle-orm";

export async function getFolders(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  sortBy: string = "folder.updatedAt DESC",
  search?: string
) {
  const result = await db
    .selectDistinct({
      id: folders.id,
      userId: folders.userId,
      name: folders.name,
      createdAt: folders.createdAt,
      updatedAt: folders.updatedAt
    })
    .from(folders)
    .where(sql`(${folders.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`)
    .orderBy(sql`${sql.raw(sortBy)}`)
    .limit(limit)
    .offset(offset);

  const total = (
    await db
      .selectDistinct({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(folders)
      .where(
        sql`(${folders.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
      )
  ).at(0);

  return { folders: result, total: total?.count };
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
