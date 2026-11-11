import { AIProvider } from "$lib/types/db";
import type { ApiKey } from "@prisma/client";

/**
 * The cheap model each provider uses for background tasks (conversation titles,
 * follow-up suggestions) unless an admin has picked another one on the admin
 * models page (see `utility-models-service.ts`).
 */
export const DEFAULT_UTILITY_MODELS: Partial<Record<AIProvider, string>> = {
  [AIProvider.Mistral]: "mistral-small-2506",
  [AIProvider.OpenAI]: "gpt-5-mini",
  [AIProvider.Google]: "models/gemini-3-flash-preview",
  [AIProvider.Anthropic]: "claude-haiku-4-5-20251001",
  [AIProvider.XAI]: "grok-3-mini",
  [AIProvider.OpenRouter]: "z-ai/glm-4.7"
};

export function setModel(apiKey: Pick<ApiKey, "provider">, originalModelId: string): string {
  return DEFAULT_UTILITY_MODELS[apiKey.provider as AIProvider] ?? originalModelId;
}
