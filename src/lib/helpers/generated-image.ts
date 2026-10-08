import type { UIDataTypes, UIMessagePart, UITools } from "ai";

/** The `generateImage` tool's successful output, as stored in a message part. */
export interface GeneratedImage {
  key: string;
  mediaType?: string;
  filename?: string;
}

export const GENERATE_IMAGE_PART_TYPE = "tool-generateImage";

/**
 * Returns the image a `generateImage` tool part produced, or null while the
 * tool is still running or if it failed. Tool parts are typed generically,
 * so the output shape is checked by hand.
 */
export function getGeneratedImage(
  part: UIMessagePart<UIDataTypes, UITools>
): GeneratedImage | null {
  if (part.type !== GENERATE_IMAGE_PART_TYPE) return null;

  const { state, output } = part as {
    state?: string;
    output?: { success?: boolean; key?: unknown; mediaType?: string; filename?: string };
  };
  if (state !== "output-available" || !output?.success || typeof output.key !== "string") {
    return null;
  }

  return { key: output.key, mediaType: output.mediaType, filename: output.filename };
}

/** True while the `generateImage` tool is waiting on the image model. */
export function isGeneratingImage(part: UIMessagePart<UIDataTypes, UITools>): boolean {
  if (part.type !== GENERATE_IMAGE_PART_TYPE) return false;
  const { state } = part as { state?: string };
  return state === "input-streaming" || state === "input-available";
}
