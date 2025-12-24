import { AIProvider } from "$lib/types/db";
import { type ApiKey } from "@prisma/client";

export function setModel(apiKey: ApiKey, originalModelId: string): string {
  let modelId = originalModelId;
  if (apiKey.provider === AIProvider.Mistral) {
    modelId = "mistral-small-2506";
  } else if (apiKey.provider === AIProvider.OpenAI) {
    modelId = "gpt-4.1-mini";
  } else if (apiKey.provider === AIProvider.Google) {
    modelId = "models/gemini-2.0-flash";
  } else if (apiKey.provider === AIProvider.Anthropic) {
    modelId = "claude-haiku-4-5-20251001";
  } else if (apiKey.provider === AIProvider.XAI) {
    modelId = "grok-3-mini";
  } else if (apiKey.provider === AIProvider.OpenRouter) {
    modelId = "deepseek/deepseek-chat-v3-0324";
  }
  return modelId;
}
