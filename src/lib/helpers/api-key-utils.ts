import { AIProvider } from "$lib/types/db";

export const LLM_PROVIDERS = [
  AIProvider.Mistral,
  AIProvider.OpenAI,
  AIProvider.Google,
  AIProvider.Anthropic,
  AIProvider.XAI,
  AIProvider.OpenRouter
] as const;

export const TTS_PROVIDERS = [AIProvider.ElevenLabs] as const;

export const ALL_PROVIDERS = [...LLM_PROVIDERS, ...TTS_PROVIDERS] as const;

export type ApiKeyMap = Record<string, boolean>;

export const hasAnyApiKey = (keys: ApiKeyMap): boolean => {
  return Object.values(keys).some(Boolean);
};

export const hasAnyLLMKey = (keys: ApiKeyMap): boolean => {
  return LLM_PROVIDERS.some((provider) => keys[provider]);
};

export const hasAnyTTSKey = (keys: ApiKeyMap): boolean => {
  return TTS_PROVIDERS.some((provider) => keys[provider]);
};

export const getMissingLLMProviders = (keys: ApiKeyMap): string[] => {
  return LLM_PROVIDERS.filter((provider) => !keys[provider]);
};

export const getMissingTTSProviders = (keys: ApiKeyMap): string[] => {
  return TTS_PROVIDERS.filter((provider) => !keys[provider]);
};
