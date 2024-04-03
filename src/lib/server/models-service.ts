import { db } from "$lib/drizzle/db";
import { models } from "$lib/drizzle/schema";
import { desc, eq, inArray } from "drizzle-orm";

export async function getModels() {
  return db
    .select({ value: models.id, label: models.name, provider: models.provider })
    .from(models)
    .orderBy(desc(models.updatedAt));
}

export async function getProviderModels(providers: string[]) {
  return db
    .select({ value: models.id, label: models.name })
    .from(models)
    .where(inArray(models.provider, providers))
    .orderBy(desc(models.updatedAt));
}

export async function getModel(id: string) {
  return db.query.models.findFirst({ where: eq(models.id, id) });
}
