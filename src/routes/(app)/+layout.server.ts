import { getApiKeys } from "$lib/server/api-keys-service";
import { AIProvider } from "$lib/types/db";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return redirect(307, "/auth/sign-in");
  }

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
