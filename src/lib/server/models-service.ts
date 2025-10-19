import { getApiKeys } from "$lib/server/api-keys-service";
import { prisma } from "$lib/server/db";
import { ReasoningType } from "$lib/types/db";
import type { AIProvider } from "@prisma/client";

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

export async function getProviderModels(providers: AIProvider[], searchText?: string) {
  const models = await prisma.model.findMany({
    where: {
      provider: { in: providers },
      name: searchText
        ? {
            contains: searchText
          }
        : undefined,
      deprecated: false
    },
    orderBy: { updatedAt: "desc" }
  });

  return models.map((model) => ({
    label: `${model.name} (${model.provider[0].toUpperCase()}${model.provider.slice(1)})`,
    value: model.id,
    reasoningType: model.reasoningType
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

export async function getUserModels(userId: string, searchText?: string) {
  const apiKeys = await getApiKeys(userId);

  if (apiKeys.length === 0) {
    return [];
  }

  const providers = apiKeys.map((key) => key.provider);

  return getProviderModels(providers, searchText);
}

export async function getUserModelsGroupedByProvider(userId: string) {
  const apiKeys = await getApiKeys(userId);

  if (apiKeys.length === 0) {
    return [];
  }

  const providers = apiKeys.map((key) => key.provider).sort();

  const allModels = await prisma.model.findMany({
    where: {
      provider: { in: providers }
    },
    orderBy: { name: "asc" }
  });

  // Group models by provider
  const grouped = providers
    .map((provider) => {
      const providerModels = allModels.filter((m) => m.provider === provider);

      return {
        provider,
        models: providerModels
          .filter((m) => !m.deprecated)
          .map((m) => ({
            id: m.id,
            name: m.name,
            reasoningType: m.reasoningType as ReasoningType,
            deprecated: m.deprecated
          })),
        deprecatedModels: providerModels
          .filter((m) => m.deprecated)
          .map((m) => ({
            id: m.id,
            name: m.name,
            reasoningType: m.reasoningType as ReasoningType,
            deprecated: m.deprecated
          }))
      };
    })
    .filter((group) => group.models.length > 0 || group.deprecatedModels.length > 0);

  return grouped;
}
