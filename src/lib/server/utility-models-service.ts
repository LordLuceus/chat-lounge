import { DEFAULT_UTILITY_MODELS, setModel } from "$lib/helpers/set-model-id";
import { prisma } from "$lib/server/db";
import { ModelReviewStatus, type AIProvider } from "@prisma/client";

export const UTILITY_MODEL_PROVIDERS = Object.keys(DEFAULT_UTILITY_MODELS) as AIProvider[];

export function isUtilityModelProvider(value: unknown): value is AIProvider {
  return typeof value === "string" && (UTILITY_MODEL_PROVIDERS as string[]).includes(value);
}

/**
 * The model to use for a provider's background tasks (conversation titles,
 * follow-up suggestions): the admin's choice if there is one, else the built-in
 * default, else the conversation's own model.
 */
export async function getUtilityModelId(
  provider: AIProvider,
  originalModelId: string
): Promise<string> {
  const override = await prisma.utilityModel.findUnique({ where: { provider } });
  return override?.modelId ?? setModel({ provider }, originalModelId);
}

/** Every provider's utility model for the admin page, with suggestions to pick from. */
export async function getUtilityModels() {
  const [overrides, models] = await Promise.all([
    prisma.utilityModel.findMany(),
    prisma.model.findMany({
      where: {
        provider: { in: UTILITY_MODEL_PROVIDERS },
        reviewStatus: ModelReviewStatus.approved,
        deprecated: false
      },
      orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      select: { id: true, name: true, provider: true }
    })
  ]);

  return UTILITY_MODEL_PROVIDERS.map((provider) => {
    const defaultModelId = DEFAULT_UTILITY_MODELS[provider] as string;
    const override = overrides.find((o) => o.provider === provider);

    return {
      provider,
      defaultModelId,
      modelId: override?.modelId ?? defaultModelId,
      isOverridden: Boolean(override),
      suggestions: models
        .filter((m) => m.provider === provider)
        .map((m) => ({ id: m.id, name: m.name }))
    };
  });
}

export async function setUtilityModel(provider: AIProvider, modelId: string) {
  return prisma.utilityModel.upsert({
    where: { provider },
    create: { provider, modelId },
    update: { modelId }
  });
}

/** Goes back to the built-in default for the provider. */
export async function resetUtilityModel(provider: AIProvider) {
  await prisma.utilityModel.deleteMany({ where: { provider } });
}
