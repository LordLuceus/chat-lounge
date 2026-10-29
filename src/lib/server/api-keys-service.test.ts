import { env } from "$env/dynamic/private";
import { AIProvider } from "$lib/types/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePrisma, type FakePrisma } from "../../tests/fake-prisma";

const prisma = vi.hoisted(() => ({ current: null as unknown as FakePrisma }));
vi.mock("$lib/server/db", () => ({
  get prisma() {
    return prisma.current;
  }
}));

const { ApiKeyEncryptionError, isEncrypted } = await import("./api-key-crypto");
const { encryptLegacyApiKeys, getApiKey, getApiKeyProviders, getApiKeys, saveApiKey } =
  await import("./api-keys-service");

const configuredKey = env.API_KEY_ENCRYPTION_KEY;
const stored = () => prisma.current.$tables.apiKey;

beforeEach(() => {
  prisma.current = createFakePrisma({ users: [{ id: "u1", username: "alice" }] });
});

afterEach(() => {
  env.API_KEY_ENCRYPTION_KEY = configuredKey;
});

describe("api-keys-service", () => {
  it("stores keys encrypted and hands back the plaintext", async () => {
    const saved = await saveApiKey("sk-openai", "u1", AIProvider.OpenAI);
    expect(saved).toMatchObject({ userId: "u1", provider: "openai", key: "sk-openai" });
    expect(saved).not.toHaveProperty("encryptedKey");

    expect(stored()).toHaveLength(1);
    expect(isEncrypted(stored()[0].encryptedKey)).toBe(true);
    expect(JSON.stringify(stored())).not.toContain("sk-openai");

    expect(await getApiKey("u1", AIProvider.OpenAI)).toMatchObject({ key: "sk-openai" });
    expect(await getApiKey("u1", AIProvider.Anthropic)).toBeNull();
    expect(await getApiKey("u2", AIProvider.OpenAI)).toBeNull();
  });

  it("replaces the existing key for a provider instead of adding a row", async () => {
    await saveApiKey("first", "u1", AIProvider.OpenAI);
    await saveApiKey("second", "u1", AIProvider.OpenAI);
    expect(stored()).toHaveLength(1);
    expect(await getApiKey("u1", AIProvider.OpenAI)).toMatchObject({ key: "second" });
  });

  it("lists a user's keys decrypted, and their providers without decrypting", async () => {
    await saveApiKey("sk-openai", "u1", AIProvider.OpenAI);
    await saveApiKey("sk-eleven", "u1", AIProvider.ElevenLabs);
    await saveApiKey("sk-other", "u2", AIProvider.OpenAI);

    const keys = await getApiKeys("u1");
    expect(keys.map((k) => [k.provider, k.key]).sort()).toEqual([
      ["elevenlabs", "sk-eleven"],
      ["openai", "sk-openai"]
    ]);
    expect((await getApiKeyProviders("u1")).sort()).toEqual(["elevenlabs", "openai"]);
    expect(await getApiKeyProviders("u3")).toEqual([]);
  });

  it("re-encrypts a legacy plaintext row the first time it is read", async () => {
    await prisma.current.apiKey.create({
      data: { userId: "u1", provider: "openai", encryptedKey: "sk-legacy" }
    });

    expect(await getApiKey("u1", AIProvider.OpenAI)).toMatchObject({ key: "sk-legacy" });
    expect(isEncrypted(stored()[0].encryptedKey)).toBe(true);
    expect(stored()[0].encryptedKey).not.toContain("sk-legacy");
    expect(await getApiKeys("u1")).toMatchObject([{ key: "sk-legacy" }]);
  });

  it("encrypts every legacy row at startup and leaves sealed rows alone", async () => {
    await saveApiKey("sk-sealed", "u1", AIProvider.Anthropic);
    const sealed = stored()[0].encryptedKey;
    await prisma.current.apiKey.create({
      data: { userId: "u1", provider: "openai", encryptedKey: "sk-legacy-1" }
    });
    await prisma.current.apiKey.create({
      data: { userId: "u2", provider: "google", encryptedKey: "sk-legacy-2" }
    });

    expect(await encryptLegacyApiKeys()).toBe(2);
    expect(stored().every((row) => isEncrypted(row.encryptedKey))).toBe(true);
    expect(stored()[0].encryptedKey).toBe(sealed);
    expect(await getApiKey("u1", AIProvider.OpenAI)).toMatchObject({ key: "sk-legacy-1" });
    expect(await getApiKey("u2", AIProvider.Google)).toMatchObject({ key: "sk-legacy-2" });
    expect(await encryptLegacyApiKeys()).toBe(0);
  });

  it("binds each key to its owner: a row copied to another user does not decrypt", async () => {
    await saveApiKey("sk-openai", "u1", AIProvider.OpenAI);
    await prisma.current.apiKey.create({
      data: { userId: "u2", provider: "openai", encryptedKey: stored()[0].encryptedKey }
    });
    await expect(getApiKey("u2", AIProvider.OpenAI)).rejects.toThrow(ApiKeyEncryptionError);
  });

  it("fails clearly, without writing anything, when the encryption key is missing", async () => {
    env.API_KEY_ENCRYPTION_KEY = "";
    await expect(saveApiKey("sk-openai", "u1", AIProvider.OpenAI)).rejects.toThrow(
      /API_KEY_ENCRYPTION_KEY is not set/
    );
    expect(stored()).toHaveLength(0);
  });
});
