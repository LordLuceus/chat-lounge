import { AIProvider } from "$lib/types/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePrisma, type FakePrisma } from "../../tests/fake-prisma";

const prisma = vi.hoisted(() => ({ current: null as unknown as FakePrisma }));
vi.mock("$lib/server/db", () => ({
  get prisma() {
    return prisma.current;
  }
}));

const {
  getModel,
  getModels,
  getModelsForReview,
  getProviderModels,
  getUserModels,
  getUserModelsGroupedByProvider,
  reviewModel
} = await import("./models-service");
const { saveApiKey } = await import("./api-keys-service");

beforeEach(async () => {
  prisma.current = createFakePrisma({
    models: [
      {
        id: "gpt-a",
        name: "GPT A",
        provider: "openai",
        tokenLimit: 1,
        releaseDate: new Date("2026-01-01")
      },
      {
        id: "gpt-b",
        name: "GPT B",
        provider: "openai",
        tokenLimit: 1,
        releaseDate: new Date("2026-03-01")
      },
      { id: "gpt-old", name: "GPT Old", provider: "openai", tokenLimit: 1, deprecated: true },
      {
        id: "gpt-pending",
        name: "GPT Pending",
        provider: "openai",
        tokenLimit: 1,
        reviewStatus: "pending"
      },
      {
        id: "claude",
        name: "Claude",
        provider: "anthropic",
        tokenLimit: 1,
        reasoningType: "hybrid",
        releaseDate: new Date("2026-02-01")
      },
      { id: "gemini", name: "Gemini", provider: "google", tokenLimit: 1, supportsVideo: true },
      {
        id: "rejected",
        name: "Rejected",
        provider: "google",
        tokenLimit: 1,
        reviewStatus: "rejected"
      }
    ]
  });
  await saveApiKey("k1", "u1", AIProvider.OpenAI);
  await saveApiKey("k2", "u1", AIProvider.Anthropic);
});

describe("getModel", () => {
  it("returns a model or throws", async () => {
    expect((await getModel("gpt-a")).name).toBe("GPT A");
    await expect(getModel("nope")).rejects.toThrow(/not found/);
  });
});

describe("approved model lists", () => {
  it("only lists approved models", async () => {
    expect((await getModels()).map((m) => m.value).sort()).toEqual(
      ["claude", "gemini", "gpt-a", "gpt-b", "gpt-old"].sort()
    );
  });

  it("filters provider models by provider, search and deprecation", async () => {
    const models = await getProviderModels(["openai"], "GPT");
    expect(models.map((m) => m.value).sort()).toEqual(["gpt-a", "gpt-b"]);
    expect(models[0].label).toMatch(/\(Openai\)$/);
  });

  it("returns the models the user has keys for", async () => {
    expect((await getUserModels("u1")).map((m) => m.value).sort()).toEqual([
      "claude",
      "gpt-a",
      "gpt-b"
    ]);
    expect(await getUserModels("nobody")).toEqual([]);
  });
});

describe("getUserModelsGroupedByProvider", () => {
  it("groups by provider, newest first, with deprecated models separate", async () => {
    const groups = await getUserModelsGroupedByProvider("u1");
    expect(groups.map((g) => g.provider)).toEqual(["anthropic", "openai"]);
    const openai = groups[1];
    expect(openai.models.map((m) => m.id)).toEqual(["gpt-b", "gpt-a"]);
    expect(openai.deprecatedModels.map((m) => m.id)).toEqual(["gpt-old"]);
    expect(groups[0].models[0]).toMatchObject({
      id: "claude",
      reasoningType: "hybrid",
      supportsVideo: false
    });
  });

  it("is empty without API keys", async () => {
    expect(await getUserModelsGroupedByProvider("nobody")).toEqual([]);
  });
});

describe("review", () => {
  it("lists pending and rejected models and applies review decisions", async () => {
    expect((await getModelsForReview()).map((m) => m.id).sort()).toEqual([
      "gpt-pending",
      "rejected"
    ]);
    await reviewModel("gpt-pending", "approved", { reasoningType: "full", adaptiveThinking: true });
    expect(await getModel("gpt-pending")).toMatchObject({
      reviewStatus: "approved",
      reasoningType: "full",
      adaptiveThinking: true
    });
    expect((await getModelsForReview()).map((m) => m.id)).toEqual(["rejected"]);
  });
});
