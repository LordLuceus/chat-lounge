import { AIProvider } from "$lib/types/db";
import { type ApiKey } from "@prisma/client";

export function setModel(apiKey: ApiKey, originalModelId: string): string {
  let modelId = originalModelId;
  if (apiKey.provider === AIProvider.Mistral) {
    modelId = "mistral-small-latest";
  } else if (apiKey.provider === AIProvider.OpenAI) {
    modelId = "gpt-4.1-mini";
  } else if (apiKey.provider === AIProvider.Google) {
    modelId = "models/gemini-2.0-flash";
  } else if (apiKey.provider === AIProvider.Anthropic) {
    modelId = "claude-3-5-haiku-20241022";
  } else if (apiKey.provider === AIProvider.XAI) {
    modelId = "grok-3-mini";
  }
  return modelId;
}
