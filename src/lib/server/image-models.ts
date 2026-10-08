import { AIProvider } from "$lib/types/db";

export interface ImageModel {
  provider: AIProvider;
  /** Model ID as the provider's image API expects it. */
  id: string;
  name: string;
}

/**
 * The image model used for each provider that offers one. Image models are
 * not in the `Model` table: the models.dev sync only covers chat models, and
 * the user never picks an image model directly; the chat model hands off to
 * it through the `generateImage` tool.
 */
export const IMAGE_MODELS: Partial<Record<AIProvider, ImageModel>> = {
  [AIProvider.OpenAI]: { provider: AIProvider.OpenAI, id: "gpt-image-2", name: "GPT Image 2" },
  [AIProvider.Google]: {
    provider: AIProvider.Google,
    id: "gemini-3.1-flash-image-preview",
    name: "Nano Banana 2 (Gemini 3.1 Flash Image)"
  },
  [AIProvider.XAI]: {
    provider: AIProvider.XAI,
    id: "grok-imagine-image",
    name: "Grok Imagine Image"
  },
  [AIProvider.OpenRouter]: {
    provider: AIProvider.OpenRouter,
    id: "google/gemini-3.1-flash-image-preview",
    name: "Nano Banana 2 (Gemini 3.1 Flash Image, via OpenRouter)"
  }
};

/** Order of preference when the chat model's own provider has no image model. */
const FALLBACK_ORDER: AIProvider[] = [
  AIProvider.OpenAI,
  AIProvider.Google,
  AIProvider.XAI,
  AIProvider.OpenRouter
];

/**
 * Picks the image model for a chat request: the chat model's provider if it
 * offers one, otherwise the first provider in `FALLBACK_ORDER` the user has
 * an API key for. Returns null when none of the user's keys can generate
 * images, in which case the tool is not offered to the model.
 */
export function selectImageModel(
  availableProviders: AIProvider[],
  chatProvider: AIProvider
): ImageModel | null {
  const available = new Set(availableProviders);

  for (const provider of [chatProvider, ...FALLBACK_ORDER]) {
    const model = IMAGE_MODELS[provider];
    if (model && available.has(provider)) return model;
  }

  return null;
}
