import { currentTime } from "./current-time";
import { fetchWebpage } from "./fetch-webpage";
import { createGenerateImageTool, type GenerateImageToolOptions } from "./generate-image";
import { webSearch } from "./web-search";

export type { GenerateImageOutput, GenerateImageToolOptions } from "./generate-image";

export interface ToolOptions {
  /** When set, the model can hand off to this image model via `generateImage`. */
  imageGeneration?: GenerateImageToolOptions;
}

/**
 * Tools are built per request: `generateImage` needs the user's API key for
 * the image provider and their user ID for file ownership, and is only
 * offered when the user has a key for a provider that can generate images.
 */
export function createTools({ imageGeneration }: ToolOptions = {}) {
  return {
    currentTime,
    fetchWebpage,
    webSearch,
    ...(imageGeneration && { generateImage: createGenerateImageTool(imageGeneration) })
  };
}
