import { AIProvider } from "$lib/drizzle/schema";
import { getApiKeys } from "$lib/server/api-keys-service";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { userId } = locals.session!;
  const storedKeys = await getApiKeys(userId!);

  const keys = {
    mistral: storedKeys.some((key) => key.provider === AIProvider.Mistral),
    eleven: storedKeys.some((key) => key.provider === AIProvider.ElevenLabs),
    openai: storedKeys.some((key) => key.provider === AIProvider.OpenAI),
    google: storedKeys.some((key) => key.provider === AIProvider.Google)
  };

  return {
    keys
  };
}) satisfies LayoutServerLoad;
