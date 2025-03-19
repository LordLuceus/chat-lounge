import { getApiKeys } from "$lib/server/api-keys-service";
import { db, models } from "$lib/server/db";
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

export async function getUserModels(userId: string) {
  const apiKeys = await getApiKeys(userId);

  if (apiKeys.length === 0) {
    return [];
  }

  const providers = apiKeys.map((key) => key.provider);

  return getProviderModels(providers);
}
