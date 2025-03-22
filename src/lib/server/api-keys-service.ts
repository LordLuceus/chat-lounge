import { prisma } from "$lib/server/db";
import { AIProvider } from "$lib/types/db";

export const saveApiKey = async (key: string, userId: string, provider: AIProvider) => {
  const existingApiKey = await getApiKey(userId, provider);

  if (existingApiKey) {
    return prisma.apiKey.update({
      where: { id: existingApiKey.id },
      data: { key }
    });
  }

  return prisma.apiKey.create({
    data: {
      userId,
      provider,
      key
    }
  });
};

export const getApiKey = async (userId: string, provider: AIProvider) => {
  const apiKey = await prisma.apiKey.findFirst({
    where: { userId, provider }
  });

  return apiKey;
};

export const getApiKeys = async (userId: string) => {
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId }
  });

  return apiKeys;
};
