import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePrisma, type FakePrisma } from "../../tests/fake-prisma";

const prisma = vi.hoisted(() => ({ current: null as unknown as FakePrisma }));
vi.mock("$lib/server/db", () => ({
  get prisma() {
    return prisma.current;
  }
}));

const { syncModels } = await import("./model-sync");

const recent = new Date();
recent.setMonth(recent.getMonth() - 1);
const RECENT = recent.toISOString().slice(0, 10);
const OLD = "2020-01-01";

const chat = (overrides: Record<string, unknown>) => ({
  modalities: { input: ["text"], output: ["text"] },
  limit: { context: 100000 },
  release_date: RECENT,
  tool_call: true,
  ...overrides
});

function catalogue(data: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(data))
  );
}

beforeEach(() => {
  prisma.current = createFakePrisma({
    models: [
      {
        id: "gpt-old",
        name: "GPT Old",
        provider: "openai",
        tokenLimit: 8000,
        supportsTools: false
      },
      { id: "models/gemini-x", name: "Gemini X", provider: "google", tokenLimit: 1000 },
      { id: "gone", name: "Gone", provider: "mistral", tokenLimit: 1000 }
    ]
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("syncModels", () => {
  it("refreshes capabilities of known models and reports the ones models.dev lacks", async () => {
    catalogue({
      openai: {
        models: {
          "gpt-old": chat({
            id: "gpt-old",
            name: "Renamed",
            modalities: { input: ["text", "image", "video"], output: ["text"] },
            status: "deprecated",
            release_date: "2024-05-01",
            limit: { context: 999 }
          })
        }
      },
      google: { models: { "gemini-x": chat({ id: "gemini-x", name: "G", tool_call: false }) } },
      mistral: { models: {} }
    });

    const result = await syncModels();

    expect(result.updated).toBe(2);
    expect(result.unmatched).toEqual(["mistral:gone"]);
    const gptOld = await prisma.current.model.findUnique({ where: { id: "gpt-old" } });
    expect(gptOld).toMatchObject({
      name: "GPT Old",
      tokenLimit: 8000,
      supportsTools: true,
      supportsImages: true,
      supportsVideo: true,
      deprecated: true,
      releaseDate: new Date("2024-05-01")
    });
    // Google IDs match with or without the models/ prefix.
    expect(
      await prisma.current.model.findUnique({ where: { id: "models/gemini-x" } })
    ).toMatchObject({ supportsTools: false });
  });

  it("adds recent chat models as pending with inferred reasoning settings", async () => {
    catalogue({
      anthropic: {
        models: {
          "claude-new": chat({
            id: "claude-new",
            name: "Claude New",
            reasoning: true,
            reasoning_options: [{ type: "effort" }]
          })
        }
      },
      openai: {
        models: {
          "o-new": chat({
            id: "o-new",
            name: "O New",
            reasoning: true,
            reasoning_options: [{ type: "effort" }]
          }),
          "gpt-new": chat({
            id: "gpt-new",
            name: "GPT New",
            reasoning: true,
            reasoning_options: [{ type: "toggle" }, { type: "effort" }]
          }),
          plain: chat({ id: "plain", name: "Plain" })
        }
      }
    });

    const result = await syncModels();

    expect(result.added.sort()).toEqual(
      ["anthropic:claude-new", "openai:gpt-new", "openai:o-new", "openai:plain"].sort()
    );
    const byId = async (id: string) => prisma.current.model.findUnique({ where: { id } });
    expect(await byId("claude-new")).toMatchObject({
      reviewStatus: "pending",
      reasoningType: "hybrid",
      adaptiveThinking: true,
      tokenLimit: 100000
    });
    expect(await byId("o-new")).toMatchObject({ reasoningType: "full", adaptiveThinking: null });
    expect(await byId("gpt-new")).toMatchObject({ reasoningType: "hybrid" });
    expect(await byId("plain")).toMatchObject({ reasoningType: "none" });
  });

  it("skips models that are not new chat models from the provider itself", async () => {
    await prisma.current.deletedModel.create({ data: { id: "deleted-one", provider: "openai" } });
    catalogue({
      openai: {
        models: {
          old: chat({ id: "old", name: "Old", release_date: OLD }),
          latest: chat({ id: "gpt-latest", name: "Latest" }),
          deprecated: chat({ id: "dep", name: "Dep", status: "deprecated" }),
          embed: chat({ id: "text-embedding-4", name: "Embed" }),
          multimodal: chat({
            id: "image-gen",
            name: "Img",
            modalities: { input: ["text"], output: ["text", "image"] }
          }),
          undated: chat({ id: "undated", name: "Undated", release_date: undefined }),
          nolimit: chat({ id: "nolimit", name: "No limit", limit: undefined }),
          hosted: chat({ id: "hosted", name: "Hosted", canonical_model_id: "zai/glm" }),
          own: chat({ id: "own", name: "Own", canonical_model_id: "openai/own" }),
          deleted: chat({ id: "deleted-one", name: "Deleted" })
        }
      },
      openrouter: {
        models: {
          "openai/gpt": chat({ id: "openai/gpt", name: "dup" }),
          "z-ai/glm:free": chat({ id: "z-ai/glm:free", name: "variant" }),
          "z-ai/glm": chat({ id: "z-ai/glm", name: "GLM" })
        }
      }
    });

    const result = await syncModels();

    expect(result.added.sort()).toEqual(["openai:own", "openrouter:z-ai/glm"]);
  });

  it("does not add a model whose ID already exists for another provider", async () => {
    catalogue({ google: { models: { "gpt-old": chat({ id: "gpt-old", name: "Clash" }) } } });
    const result = await syncModels();
    expect(result.added).toEqual([]);
    expect(await prisma.current.model.count()).toBe(3);
  });

  it("skips providers with unexpected data and tolerates missing ones", async () => {
    catalogue({ openai: { nope: true } });
    const result = await syncModels();
    expect(result).toEqual({ updated: 0, added: [], unmatched: [] });
  });

  it("changes nothing when models.dev cannot be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503, statusText: "Unavailable" }))
    );
    await expect(syncModels()).rejects.toThrow(/503/);
    expect(await prisma.current.model.count()).toBe(3);
  });
});
