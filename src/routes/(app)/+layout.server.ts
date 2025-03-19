import { getApiKeys } from "$lib/server/api-keys-service";
import { AIProvider } from "$lib/server/db/schema";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  if (!locals.session?.userId) {
    return {};
  }

  const { userId } = locals.session;
  const storedKeys = await getApiKeys(userId);

  const keys = {
    mistral: storedKeys.some((key) => key.provider === AIProvider.Mistral),
    eleven: storedKeys.some((key) => key.provider === AIProvider.ElevenLabs),
    openai: storedKeys.some((key) => key.provider === AIProvider.OpenAI),
    google: storedKeys.some((key) => key.provider === AIProvider.Google),
    anthropic: storedKeys.some((key) => key.provider === AIProvider.Anthropic)
  };

  return {
    keys
  };
}) satisfies LayoutServerLoad;
