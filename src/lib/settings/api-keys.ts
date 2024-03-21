import { db } from "$lib/drizzle/db";
import { AIProvider, apiKeys } from "$lib/drizzle/schema";
import { and, eq } from "drizzle-orm";

export const saveApiKey = async (key: string, userId: string, provider: AIProvider) => {
  const existingApiKey = (
    await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
  ).at(0);

  if (existingApiKey) {
    return db.update(apiKeys).set({ key }).where(eq(apiKeys.id, existingApiKey.id));
  }

  return db.insert(apiKeys).values({ key, userId, provider });
};

export const getApiKey = async (userId: string, provider: AIProvider) => {
  return (
    await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
  ).at(0);
};
