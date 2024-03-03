import prisma from "$lib/prisma";
import type { AIProvider } from "@prisma/client";

export const saveApiKey = async (key: string, userId: string, provider: AIProvider) => {
  await prisma.apiKey.create({
    data: { userId, key, provider }
  });
};

export const getApiKey = async (userId: string, provider: AIProvider) => {
  const apiKey = await prisma.apiKey.findFirst({
    where: { userId, provider }
  });
  if (!apiKey) return null;
  return apiKey;
};
