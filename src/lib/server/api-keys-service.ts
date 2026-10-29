import { decryptApiKey, encryptApiKey, isEncrypted } from "$lib/server/api-key-crypto";
import { prisma } from "$lib/server/db";
import { AIProvider } from "$lib/types/db";
import type { ApiKey } from "@prisma/client";

/**
 * API keys are stored encrypted (see api-key-crypto.ts). The `encryptedKey`
 * column never leaves this module: callers get the decrypted `key` instead.
 * Code that only needs to know which providers a user has configured should
 * use `getApiKeyProviders`, which never decrypts anything.
 */
export type DecryptedApiKey = Omit<ApiKey, "encryptedKey"> & { key: string };

/** Longest key accepted; the ciphertext of anything longer would not fit the column. */
export const MAX_API_KEY_LENGTH = 512;

export const saveApiKey = async (key: string, userId: string, provider: AIProvider) => {
  const encryptedKey = encryptApiKey(key, { userId, provider });
  const existing = await prisma.apiKey.findFirst({
    where: { userId, provider },
    select: { id: true }
  });

  const saved = existing
    ? await prisma.apiKey.update({ where: { id: existing.id }, data: { encryptedKey } })
    : await prisma.apiKey.create({ data: { userId, provider, encryptedKey } });

  return reveal(saved, key);
};

export const getApiKey = async (
  userId: string,
  provider: AIProvider
): Promise<DecryptedApiKey | null> => {
  const apiKey = await prisma.apiKey.findFirst({
    where: { userId, provider }
  });

  return apiKey ? decrypt(apiKey) : null;
};

export const getApiKeys = async (userId: string): Promise<DecryptedApiKey[]> => {
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId }
  });

  return Promise.all(apiKeys.map(decrypt));
};

/** The providers a user has a key for, without touching the keys themselves. */
export const getApiKeyProviders = async (userId: string): Promise<AIProvider[]> => {
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId },
    select: { provider: true }
  });

  return apiKeys.map((apiKey) => apiKey.provider as AIProvider);
};

/**
 * Encrypts keys stored in plaintext before encryption at rest was introduced.
 * Runs at server start; `getApiKey(s)` also handles any such row they meet.
 * Returns how many rows were re-encrypted.
 */
export const encryptLegacyApiKeys = async (): Promise<number> => {
  const apiKeys = await prisma.apiKey.findMany();
  let count = 0;
  for (const apiKey of apiKeys) {
    if (isEncrypted(apiKey.encryptedKey)) continue;
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { encryptedKey: encryptApiKey(apiKey.encryptedKey, apiKey) }
    });
    count++;
  }
  return count;
};

async function decrypt(apiKey: ApiKey): Promise<DecryptedApiKey> {
  if (isEncrypted(apiKey.encryptedKey)) {
    return reveal(apiKey, decryptApiKey(apiKey.encryptedKey, apiKey));
  }

  // A legacy plaintext row: seal it now so it does not stay in the clear.
  const key = apiKey.encryptedKey;
  const updated = await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { encryptedKey: encryptApiKey(key, apiKey) }
  });
  return reveal(updated, key);
}

function reveal(apiKey: ApiKey, key: string): DecryptedApiKey {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { encryptedKey, ...rest } = apiKey;
  return { ...rest, key };
}
