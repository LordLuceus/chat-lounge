import { env } from "$env/dynamic/private";
import { afterEach, describe, expect, it } from "vitest";
import {
  ApiKeyEncryptionError,
  decryptApiKey,
  encryptApiKey,
  getEncryptionKey,
  isEncrypted,
  isEncryptionKeyConfigured
} from "./api-key-crypto";

const context = { userId: "user_1", provider: "openai" };
const configuredKey = env.API_KEY_ENCRYPTION_KEY;

afterEach(() => {
  env.API_KEY_ENCRYPTION_KEY = configuredKey;
});

describe("api-key-crypto", () => {
  it("round-trips a key and never stores it in the clear", () => {
    const stored = encryptApiKey("sk-live-secret", context);
    expect(isEncrypted(stored)).toBe(true);
    expect(stored).not.toContain("sk-live-secret");
    expect(Buffer.from(stored.slice("enc:v1:".length), "base64").toString("latin1")).not.toContain(
      "sk-live"
    );
    expect(decryptApiKey(stored, context)).toBe("sk-live-secret");
  });

  it("uses a fresh nonce each time, so equal keys give different ciphertexts", () => {
    expect(encryptApiKey("same", context)).not.toBe(encryptApiKey("same", context));
  });

  it("handles unicode and long keys", () => {
    const long = "k".repeat(512) + " ünïcödé 🔑";
    expect(decryptApiKey(encryptApiKey(long, context), context)).toBe(long);
  });

  it("refuses a ciphertext moved to another user or provider", () => {
    const stored = encryptApiKey("sk-live-secret", context);
    expect(() => decryptApiKey(stored, { ...context, userId: "user_2" })).toThrow(
      ApiKeyEncryptionError
    );
    expect(() => decryptApiKey(stored, { ...context, provider: "anthropic" })).toThrow(
      ApiKeyEncryptionError
    );
  });

  it("refuses a tampered ciphertext", () => {
    const stored = encryptApiKey("sk-live-secret", context);
    const bytes = Buffer.from(stored.slice("enc:v1:".length), "base64");
    bytes[bytes.length - 1] ^= 0x01;
    const tampered = "enc:v1:" + bytes.toString("base64");
    expect(() => decryptApiKey(tampered, context)).toThrow(ApiKeyEncryptionError);
    expect(() => decryptApiKey("enc:v1:AAAA", context)).toThrow(ApiKeyEncryptionError);
    expect(() => decryptApiKey("plain-text", context)).toThrow(ApiKeyEncryptionError);
  });

  it("refuses to decrypt under a different key", () => {
    const stored = encryptApiKey("sk-live-secret", context);
    env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    expect(() => decryptApiKey(stored, context)).toThrow(/API_KEY_ENCRYPTION_KEY has changed/);
  });

  it("accepts the key as base64 or hex and rejects anything else", () => {
    const raw = Buffer.alloc(32, 9);
    env.API_KEY_ENCRYPTION_KEY = raw.toString("base64");
    expect(getEncryptionKey().equals(raw)).toBe(true);
    env.API_KEY_ENCRYPTION_KEY = raw.toString("hex");
    expect(getEncryptionKey().equals(raw)).toBe(true);

    env.API_KEY_ENCRYPTION_KEY = "too-short";
    expect(() => getEncryptionKey()).toThrow(/exactly 32 bytes/);
    expect(isEncryptionKeyConfigured()).toBe(false);

    env.API_KEY_ENCRYPTION_KEY = "";
    expect(() => getEncryptionKey()).toThrow(/is not set/);
    expect(() => encryptApiKey("x", context)).toThrow(ApiKeyEncryptionError);
    expect(isEncryptionKeyConfigured()).toBe(false);
  });
});
