import { createChessTools } from "./chess";
import { currentTime } from "./current-time";
import { fetchWebpage } from "./fetch-webpage";
import { createGenerateImageTool, type GenerateImageToolOptions } from "./generate-image";
import { webSearch } from "./web-search";

export type { GenerateImageOutput, GenerateImageToolOptions } from "./generate-image";

export interface ToolOptions {
  /** When set, the model can hand off to this image model via `generateImage`. */
  imageGeneration?: GenerateImageToolOptions;
  /** When true, the chess analysis tools are offered (a chess engine is configured). */
  chess?: boolean;
}

/**
 * Tools are built per request: `generateImage` needs the user's API key for
 * the image provider and their user ID for file ownership, and is only
 * offered when the user has a key for a provider that can generate images.
 * The chess tools need a Stockfish binary on the server.
 */
export function createTools({ imageGeneration, chess }: ToolOptions = {}) {
  return {
    currentTime,
    fetchWebpage,
    webSearch,
    ...(imageGeneration && { generateImage: createGenerateImageTool(imageGeneration) }),
    ...(chess && createChessTools())
  };
}
