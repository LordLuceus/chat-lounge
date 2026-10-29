import { dev } from "$app/environment";
import type { Handle, ServerInit } from "@sveltejs/kit";
import { withClerkHandler } from "svelte-clerk/server";

export const init: ServerInit = async () => {
  await prepareApiKeyEncryption();

  // The queue connects to the Docker-only Redis host, so only schedule in production.
  // In development, use "Sync now" on the admin models page instead.
  if (dev) return;

  try {
    const { scheduleModelSync } = await import("$lib/server/queue");
    await scheduleModelSync();
  } catch (err) {
    console.error("[model-sync] Could not schedule daily sync:", err);
  }
};

/**
 * Users' API keys are encrypted at rest under API_KEY_ENCRYPTION_KEY. Without
 * it, keys can be neither saved nor read, so production refuses to start
 * rather than come up broken; development only warns. Keys stored in
 * plaintext before encryption was introduced are sealed here, on first start.
 */
async function prepareApiKeyEncryption() {
  const { ENCRYPTION_KEY_ENV, getEncryptionKey } = await import("$lib/server/api-key-crypto");

  try {
    getEncryptionKey();
  } catch (err) {
    if (!dev) throw err;
    console.warn(
      `[api-keys] ${ENCRYPTION_KEY_ENV} is not configured; saving or using API keys will fail until it is.`,
      err instanceof Error ? err.message : err
    );
    return;
  }

  try {
    const { encryptLegacyApiKeys } = await import("$lib/server/api-keys-service");
    const count = await encryptLegacyApiKeys();
    if (count > 0) console.info(`[api-keys] Encrypted ${count} stored API key(s).`);
  } catch (err) {
    console.error("[api-keys] Could not encrypt legacy API keys:", err);
  }
}

export const handle: Handle = withClerkHandler({
  signInUrl: "/auth/sign-in",
  signUpUrl: "/auth/sign-up"
});
