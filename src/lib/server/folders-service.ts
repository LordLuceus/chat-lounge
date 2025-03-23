import { prisma } from "$lib/server/db";
import { Prisma, type Folder } from "@prisma/client";

export async function getFolders(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  sortBy: string = "folder.updatedAt DESC",
  search?: string
) {
  const result = await prisma.$queryRaw<Folder[]>(
    Prisma.sql`
      SELECT DISTINCT f.id, f.userId, f.name, f.createdAt, f.updatedAt
      FROM folder f
      WHERE f.userId = ${userId}
      AND ${search ? Prisma.sql`(f.name LIKE ${"%" + search + "%"})` : Prisma.sql`true`}
      ORDER BY ${Prisma.sql`${sortBy}`}
      LIMIT ${limit} OFFSET ${offset}
    `
  );

  const totalResult = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(DISTINCT f.id) AS count FROM folder f
      WHERE f.userId = ${userId}
      AND ${search ? Prisma.sql`(f.name LIKE ${"%" + search + "%"})` : Prisma.sql`true`}
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
