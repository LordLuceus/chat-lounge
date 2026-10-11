import { AIProvider } from "$lib/types/db";
import { describe, expect, it } from "vitest";
import { IMAGE_MODELS, selectImageModel } from "./image-models";

describe("selectImageModel", () => {
  it("prefers the chat model's own provider", () => {
    expect(selectImageModel([AIProvider.OpenAI, AIProvider.Google], AIProvider.Google)).toBe(
      IMAGE_MODELS[AIProvider.Google]
    );
  });

  it("falls back in a fixed order when the chat provider has no image model", () => {
    expect(selectImageModel([AIProvider.XAI, AIProvider.Google], AIProvider.Anthropic)).toBe(
      IMAGE_MODELS[AIProvider.Google]
    );
    expect(selectImageModel([AIProvider.OpenRouter, AIProvider.XAI], AIProvider.Mistral)).toBe(
      IMAGE_MODELS[AIProvider.XAI]
    );
  });

  it("returns null when none of the user's keys can generate images", () => {
    expect(
      selectImageModel([AIProvider.Anthropic, AIProvider.Mistral], AIProvider.Anthropic)
    ).toBeNull();
    expect(selectImageModel([], AIProvider.OpenAI)).toBeNull();
  });

  it("does not pick a provider the user has no key for", () => {
    expect(selectImageModel([AIProvider.Anthropic], AIProvider.OpenAI)).toBeNull();
  });
});
