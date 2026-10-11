import { AIProvider } from "$lib/types/db";
import type { ApiKey } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { errorHandler } from "./ai-error-handler";
import {
  ALL_PROVIDERS,
  getMissingLLMProviders,
  getMissingTTSProviders,
  hasAnyApiKey,
  hasAnyLLMKey,
  hasAnyTTSKey
} from "./api-key-utils";
import { getProviderDescription, getProviderDisplayName } from "./provider-metadata";
import { setModel } from "./set-model-id";
import { ttsCleanup } from "./tts-cleanup";

describe("api-key-utils", () => {
  it("distinguishes chat keys from TTS keys", () => {
    expect(hasAnyApiKey({})).toBe(false);
    expect(hasAnyApiKey({ elevenlabs: true })).toBe(true);
    expect(hasAnyLLMKey({ elevenlabs: true })).toBe(false);
    expect(hasAnyLLMKey({ openai: true })).toBe(true);
    expect(hasAnyTTSKey({ openai: true })).toBe(false);
    expect(hasAnyTTSKey({ elevenlabs: true })).toBe(true);
  });

  it("lists the providers without a key", () => {
    expect(getMissingLLMProviders({ openai: true, google: true })).toEqual([
      "mistral",
      "anthropic",
      "xai",
      "openrouter"
    ]);
    expect(getMissingTTSProviders({})).toEqual(["elevenlabs"]);
    expect(ALL_PROVIDERS).toHaveLength(7);
  });
});

describe("setModel", () => {
  it("swaps in a cheap model per provider for background tasks", () => {
    const key = (provider: AIProvider) => ({ provider }) as ApiKey;
    expect(setModel(key(AIProvider.OpenAI), "gpt-5")).toBe("gpt-5-mini");
    expect(setModel(key(AIProvider.Anthropic), "claude-opus")).toBe("claude-haiku-4-5-20251001");
    expect(setModel(key(AIProvider.Google), "x")).toBe("models/gemini-3-flash-preview");
    expect(setModel(key(AIProvider.Mistral), "x")).toBe("mistral-small-2506");
    expect(setModel(key(AIProvider.XAI), "x")).toBe("grok-3-mini");
    expect(setModel(key(AIProvider.OpenRouter), "x")).toBe("z-ai/glm-4.7");
    expect(setModel(key(AIProvider.ElevenLabs), "keep-me")).toBe("keep-me");
  });
});

describe("provider metadata", () => {
  it("has a display name and description for every provider", () => {
    for (const provider of Object.values(AIProvider)) {
      expect(getProviderDisplayName(provider)).not.toBe(provider);
      expect(getProviderDescription(provider)).not.toBe("");
    }
    expect(getProviderDisplayName("unknown" as AIProvider)).toBe("unknown");
    expect(getProviderDescription("unknown" as AIProvider)).toBe("");
  });
});

describe("ttsCleanup", () => {
  it("strips markdown that would be read aloud", () => {
    expect(ttsCleanup("**Bold** and _italic_ and `code`")).toBe("Bold and italic and code");
    expect(ttsCleanup("## Heading\ntext")).toBe("Heading\ntext");
    expect(ttsCleanup("See [the docs](https://example.com) now")).toBe("See the docs now");
  });

  it("drops fenced code blocks entirely", () => {
    expect(ttsCleanup("before\n```js\nconst x = 1;\n```\nafter")).toBe("before\n\nafter");
  });
});

describe("errorHandler", () => {
  it("turns anything into a message string", () => {
    expect(errorHandler(null)).toBe("unknown error");
    expect(errorHandler(undefined)).toBe("unknown error");
    expect(errorHandler("plain")).toBe("plain");
    expect(errorHandler(new Error("boom"))).toBe("boom");
    expect(errorHandler({ code: 42 })).toBe('{"code":42}');
  });
});
