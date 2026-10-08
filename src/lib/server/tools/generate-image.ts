import type { ImageModel } from "$lib/server/image-models";
import { uploadGeneratedImageToR2 } from "$lib/server/r2-storage";
import { AIProvider } from "$lib/types/db";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateImage, tool, type ImageModel as SdkImageModel } from "ai";
import { z } from "zod";

export interface GenerateImageToolOptions {
  /** Owner of the generated files; R2 keys are prefixed with it for ownership checks. */
  userId: string;
  model: ImageModel;
  apiKey: string;
}

/** What the tool returns; the key is what the UI and R2 cleanup look for. */
export type GenerateImageOutput =
  | {
      success: true;
      key: string;
      mediaType: string;
      filename: string;
      model: string;
      revisedPrompt?: string;
      note: string;
    }
  | { success: false; message: string };

/**
 * OpenAI's image API takes pixel sizes; the others take aspect ratios and
 * warn about `size`, so each provider gets only the option it understands.
 */
const ASPECT_RATIOS = {
  square: { size: "1024x1024", aspectRatio: "1:1" },
  landscape: { size: "1536x1024", aspectRatio: "16:9" },
  portrait: { size: "1024x1536", aspectRatio: "9:16" }
} as const;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp"
};

function createImageModel(model: ImageModel, apiKey: string): SdkImageModel {
  switch (model.provider) {
    case AIProvider.OpenAI:
      return createOpenAI({ apiKey }).image(model.id);
    case AIProvider.Google:
      return createGoogleGenerativeAI({ apiKey }).image(model.id);
    case AIProvider.XAI:
      return createXai({ apiKey }).image(model.id);
    case AIProvider.OpenRouter:
      return createOpenRouter({ apiKey }).imageModel(model.id);
    default:
      throw new Error(`${model.provider} does not support image generation`);
  }
}

export function createGenerateImageTool({ userId, model, apiKey }: GenerateImageToolOptions) {
  return tool({
    description: `Generate an image from a text prompt using ${model.name}. The generated image is shown to the user automatically. Use this when the user asks for a picture, illustration, photo, logo, diagram, or other image.`,
    inputSchema: z.object({
      prompt: z
        .string()
        .min(1)
        .max(4000)
        .describe(
          "A detailed, self-contained description of the image: subject, setting, style, mood, lighting, colours, and composition. The image model cannot see the conversation, so include everything it needs."
        ),
      aspectRatio: z
        .enum(["square", "landscape", "portrait"])
        .optional()
        .describe("Shape of the image. Defaults to square.")
    }),
    execute: async (
      { prompt, aspectRatio = "square" },
      { abortSignal }
    ): Promise<GenerateImageOutput> => {
      try {
        const shape = ASPECT_RATIOS[aspectRatio];
        const { image, providerMetadata } = await generateImage({
          model: createImageModel(model, apiKey),
          prompt,
          ...(model.provider === AIProvider.OpenAI
            ? { size: shape.size }
            : { aspectRatio: shape.aspectRatio }),
          abortSignal
        });

        const extension = EXTENSIONS[image.mediaType] ?? "png";
        const filename = `generated_${Date.now()}.${extension}`;
        const { key } = await uploadGeneratedImageToR2(
          Buffer.from(image.uint8Array),
          image.mediaType,
          userId,
          filename
        );

        // OpenAI returns the prompt its model actually used, when it rewrote it.
        const revisedPrompt = (
          providerMetadata.openai?.images?.[0] as { revisedPrompt?: string } | undefined
        )?.revisedPrompt;

        return {
          success: true,
          key,
          mediaType: image.mediaType,
          filename,
          model: model.name,
          ...(revisedPrompt && { revisedPrompt }),
          note: "The image is already displayed to the user. Do not describe it in detail or link to it."
        };
      } catch (error) {
        return {
          success: false,
          message: `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        };
      }
    }
  });
}
