import { db } from "$lib/drizzle/db";
import { folders, type Folder } from "$lib/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";

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
    .where(
      sql`(${folders.userId} IS NULL OR ${folders.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
    )
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
        sql`(${folders.userId} IS NULL OR ${folders.userId} = ${userId}) AND ${search ? sql`${sql.raw(search)}` : sql`TRUE`}`
      )
  ).at(0);

  return { folders: result, total: total?.count };
}

export async function getFolder(userId: string, folderId: string) {
  return (
    await db
      .select({
        id: folders.id,
        userId: folders.userId,
        name: folders.name,
        createdAt: folders.createdAt,
        updatedAt: folders.updatedAt
      })
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
  ).at(0);
}

export async function createFolder({ userId, name }: Omit<Folder, "id">) {
  const folder = (await db.insert(folders).values({ userId, name }).returning()).at(0);

  if (!folder) {
    throw new Error("Failed to create folder");
  }

  return folder;
}

export async function updateFolder(
  folderId: string,
  data: Partial<Omit<Folder, "id">>,
  userId?: string
) {
  if (userId) {
    const folder = await getFolder(userId, folderId);

    if (!folder) {
      throw new Error("Folder not found");
    }
  }
  return db.update(folders).set(data).where(eq(folders.id, folderId)).returning();
}

export async function deleteFolder(userId: string, folderId: string) {
  return db.delete(folders).where(and(eq(folders.userId, userId), eq(folders.id, folderId)));
}
