import { getApiKeys } from "$lib/server/api-keys-service";
import { prisma } from "$lib/server/db";
import { ReasoningType } from "$lib/types/db";
import {
  ModelReviewStatus,
  type AIProvider,
  type ReasoningType as PrismaReasoningType
} from "@prisma/client";

export async function getModels() {
  const models = await prisma.model.findMany({
    where: { reviewStatus: ModelReviewStatus.approved },
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
      deprecated: false,
      reviewStatus: ModelReviewStatus.approved
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
      provider: { in: providers },
      reviewStatus: ModelReviewStatus.approved
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
            deprecated: m.deprecated,
            supportsImages: m.supportsImages,
            supportsVideo: m.supportsVideo
          })),
        deprecatedModels: providerModels
          .filter((m) => m.deprecated)
          .map((m) => ({
            id: m.id,
            name: m.name,
            reasoningType: m.reasoningType as ReasoningType,
            deprecated: m.deprecated,
            supportsImages: m.supportsImages,
            supportsVideo: m.supportsVideo
          }))
      };
    })
    .filter((group) => group.models.length > 0 || group.deprecatedModels.length > 0);

  return grouped;
}

export async function getModelsForReview() {
  return prisma.model.findMany({
    where: { reviewStatus: { in: [ModelReviewStatus.pending, ModelReviewStatus.rejected] } },
    orderBy: [{ reviewStatus: "asc" }, { provider: "asc" }, { releaseDate: "desc" }]
  });
}

export async function reviewModel(
  id: string,
  reviewStatus: ModelReviewStatus,
  settings?: { reasoningType: PrismaReasoningType; adaptiveThinking: boolean | null }
) {
  return prisma.model.update({
    where: { id },
    data: { reviewStatus, ...settings }
  });
}
