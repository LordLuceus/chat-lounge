import { AIProvider } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePrisma, type FakePrisma } from "../../tests/fake-prisma";

const db = vi.hoisted(() => ({ prisma: undefined as unknown as FakePrisma }));

vi.mock("$lib/server/db", () => ({
  get prisma() {
    return db.prisma;
  }
}));

import {
  getUtilityModelId,
  getUtilityModels,
  isUtilityModelProvider,
  resetUtilityModel,
  setUtilityModel
} from "./utility-models-service";

beforeEach(() => {
  db.prisma = createFakePrisma({
    models: [
      { id: "gpt-5-nano", name: "GPT-5 nano", provider: "openai", tokenLimit: 1000 },
      {
        id: "gpt-old",
        name: "GPT old",
        provider: "openai",
        tokenLimit: 1000,
        deprecated: true
      },
      { id: "claude-x", name: "Claude X", provider: "anthropic", tokenLimit: 1000 }
    ]
  });
});

describe("getUtilityModelId", () => {
  it("uses the built-in default until an admin sets a model", async () => {
    expect(await getUtilityModelId(AIProvider.openai, "gpt-5")).toBe("gpt-5-mini");

    await setUtilityModel(AIProvider.openai, "gpt-5-nano");
    expect(await getUtilityModelId(AIProvider.openai, "gpt-5")).toBe("gpt-5-nano");
    expect(await getUtilityModelId(AIProvider.anthropic, "claude-opus")).toBe(
      "claude-haiku-4-5-20251001"
    );
  });

  it("replaces an earlier choice and goes back to the default on reset", async () => {
    await setUtilityModel(AIProvider.openai, "a");
    await setUtilityModel(AIProvider.openai, "b");
    expect(db.prisma.$tables.utilityModel).toHaveLength(1);
    expect(await getUtilityModelId(AIProvider.openai, "gpt-5")).toBe("b");

    await resetUtilityModel(AIProvider.openai);
    expect(await getUtilityModelId(AIProvider.openai, "gpt-5")).toBe("gpt-5-mini");
  });

  it("keeps the conversation's model for providers without a default", async () => {
    expect(await getUtilityModelId(AIProvider.elevenlabs, "keep-me")).toBe("keep-me");
  });
});

describe("getUtilityModels", () => {
  it("lists each chat provider with its current model and suggestions", async () => {
    await setUtilityModel(AIProvider.openai, "gpt-5-nano");
    const rows = await getUtilityModels();

    expect(rows.map((r) => r.provider)).not.toContain("elevenlabs");
    expect(rows.find((r) => r.provider === "openai")).toEqual({
      provider: "openai",
      defaultModelId: "gpt-5-mini",
      modelId: "gpt-5-nano",
      isOverridden: true,
      suggestions: [{ id: "gpt-5-nano", name: "GPT-5 nano" }]
    });
    expect(rows.find((r) => r.provider === "anthropic")).toMatchObject({
      modelId: "claude-haiku-4-5-20251001",
      isOverridden: false
    });
  });
});

describe("isUtilityModelProvider", () => {
  it("accepts chat providers only", () => {
    expect(isUtilityModelProvider("google")).toBe(true);
    expect(isUtilityModelProvider("elevenlabs")).toBe(false);
    expect(isUtilityModelProvider(null)).toBe(false);
  });
});
