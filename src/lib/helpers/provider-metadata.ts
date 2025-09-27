import { AIProvider } from "$lib/types/db";

export interface ProviderMetadata {
  name: string;
  description: string;
}

export const PROVIDER_METADATA: Record<AIProvider, ProviderMetadata> = {
  [AIProvider.OpenAI]: {
    name: "OpenAI",
    description: "GPT models including GPT-4O, and the O-series reasoning models"
  },
  [AIProvider.Anthropic]: {
    name: "Anthropic",
    description: "Claude models"
  },
  [AIProvider.Google]: {
    name: "Google",
    description: "Gemini models"
  },
  [AIProvider.Mistral]: {
    name: "Mistral",
    description: "Mistral AI models"
  },
  [AIProvider.XAI]: {
    name: "XAI",
    description: "Grok models from xAI"
  },
  [AIProvider.OpenRouter]: {
    name: "OpenRouter",
    description: "Access to multiple AI models via OpenRouter"
  },
  [AIProvider.ElevenLabs]: {
    name: "ElevenLabs",
    description: "High-quality text-to-speech voices"
  }
};

export const getProviderDisplayName = (provider: AIProvider): string => {
  return PROVIDER_METADATA[provider]?.name ?? provider;
};

export const getProviderDescription = (provider: AIProvider): string => {
  return PROVIDER_METADATA[provider]?.description ?? "";
};
