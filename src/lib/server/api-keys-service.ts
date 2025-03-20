import { apiKeys, db } from "$lib/server/db";
import { AIProvider } from "$lib/types/db";
import { and, eq } from "drizzle-orm";

export const saveApiKey = async (key: string, userId: string, provider: AIProvider) => {
  const existingApiKey = await getApiKey(userId, provider);

  if (existingApiKey) {
    return db.update(apiKeys).set({ key }).where(eq(apiKeys.id, existingApiKey.id));
  }

  return db.insert(apiKeys).values({ key, userId, provider });
};

export const getApiKey = async (userId: string, provider: AIProvider) => {
  return db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider))
  });
};

export const getApiKeys = async (userId: string) => {
  return db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
};
