import prisma from "$lib/prisma";
import type { AIProvider } from "@prisma/client";

export const saveApiKey = async (key: string, userId: string, provider: AIProvider) => {
  const existingApiKey = await prisma.apiKey.findFirst({
    where: { userId, provider }
  });

  if (existingApiKey) {
    return prisma.apiKey.update({
      where: { id: existingApiKey.id },
      data: { key }
    });
  }

  return prisma.apiKey.create({
    data: {
      key,
      userId,
      provider
    }
  });
};

export const getApiKey = async (userId: string, provider: AIProvider) => {
  const apiKey = await prisma.apiKey.findFirst({
    where: { userId, provider }
  });
  if (!apiKey) return null;
  return apiKey;
};
