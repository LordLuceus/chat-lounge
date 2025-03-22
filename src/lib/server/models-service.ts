import { getApiKeys } from "$lib/server/api-keys-service";
import { prisma } from "$lib/server/db";

export async function getModels() {
  const models = await prisma.model.findMany({
    orderBy: { updatedAt: "desc" }
  });

  return models.map((model) => ({
    label: model.name,
    value: model.id,
    provider: model.provider
  }));
}

export async function getProviderModels(providers: string[]) {
  const models = await prisma.model.findMany({
    where: {
      provider: { in: providers }
    },
    orderBy: { updatedAt: "desc" }
  });

  return models.map((model) => ({
    label: model.name,
    value: model.id
  }));
}

export async function getModel(id: string) {
  const model = await prisma.model.findUnique({
    where: { id }
  });

  if (!model) {
    throw new Error("Model not found");
  }

  return model;
}

export async function getUserModels(userId: string) {
  const apiKeys = await getApiKeys(userId);

  if (apiKeys.length === 0) {
    return [];
  }

  const providers = apiKeys.map((key) => key.provider);

  return getProviderModels(providers);
}
