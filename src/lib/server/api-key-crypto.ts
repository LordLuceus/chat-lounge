import { env } from "$env/dynamic/private";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encryption at rest for users' provider API keys.
 *
 * Keys are sealed with AES-256-GCM under a single server-side secret,
 * `API_KEY_ENCRYPTION_KEY`, so a copy of the database (a backup, a dump, a
 * read-only leak) does not expose them. Each ciphertext is bound to the owning
 * user and provider through GCM's additional authenticated data, so a row
 * moved or copied onto another user by someone with database access will not
 * decrypt. Decryption also fails if the stored value was altered.
 *
 * Stored form: `enc:v1:` followed by base64 of iv (12 bytes) | tag (16 bytes) | ciphertext.
 * Anything without the prefix is a legacy plaintext key from before encryption
 * was introduced; the service re-encrypts those as it meets them.
 */

export const ENCRYPTION_KEY_ENV = "API_KEY_ENCRYPTION_KEY";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class ApiKeyEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyEncryptionError";
  }
}

const MISSING_KEY_MESSAGE =
  `${ENCRYPTION_KEY_ENV} is not set. It must hold 32 random bytes as base64 or hex; ` +
  `generate one with \`openssl rand -base64 32\` and add it to .env. ` +
  `Losing it makes every stored API key unreadable, so back it up with the database.`;

function decodeKey(raw: string): Buffer | null {
  const value = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, "hex");
  }
  const decoded = Buffer.from(value, "base64");
  return decoded.length === KEY_BYTES ? decoded : null;
}

/** The configured encryption key, or a descriptive error when it is missing or malformed. */
export function getEncryptionKey(): Buffer {
  const raw = env[ENCRYPTION_KEY_ENV];
  if (!raw) {
    throw new ApiKeyEncryptionError(MISSING_KEY_MESSAGE);
  }
  const key = decodeKey(raw);
  if (!key) {
    throw new ApiKeyEncryptionError(
      `${ENCRYPTION_KEY_ENV} must decode to exactly ${KEY_BYTES} bytes (base64 or hex); ` +
        `generate one with \`openssl rand -base64 32\`.`
    );
  }
  return key;
}

export function isEncryptionKeyConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/** Whether a stored value is sealed, as opposed to a legacy plaintext key. */
export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

/** The context a ciphertext is bound to: it only decrypts for the same user and provider. */
function additionalData(context: ApiKeyContext): Buffer {
  return Buffer.from(`${context.userId}\u0000${context.provider}`, "utf8");
}

export interface ApiKeyContext {
  userId: string;
  provider: string;
}

export function encryptApiKey(plaintext: string, context: ApiKeyContext): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(additionalData(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptApiKey(stored: string, context: ApiKeyContext): string {
  if (!isEncrypted(stored)) {
    throw new ApiKeyEncryptionError("Stored API key is not encrypted");
  }
  const key = getEncryptionKey();
  const payload = Buffer.from(stored.slice(PREFIX.length), "base64");
  if (payload.length < IV_BYTES + TAG_BYTES) {
    throw new ApiKeyEncryptionError("Stored API key is malformed");
  }
  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  decipher.setAAD(additionalData(context));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key, tampered value, or a row moved to another user/provider.
    throw new ApiKeyEncryptionError(
      `Stored API key could not be decrypted. Either ${ENCRYPTION_KEY_ENV} has changed or the stored value was altered.`
    );
  }
}
