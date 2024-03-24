import { AIProvider } from "$lib/drizzle/schema";
import { getApiKeys } from "$lib/server/api-keys-service";
import type { Config } from "@sveltejs/adapter-vercel";
import type { LayoutServerLoad } from "./$types";

interface ApiKeys {
  mistral: boolean;
  eleven: boolean;
  openai: boolean;
}

export const config: Config = { runtime: "edge" };

export const load = (async (event) => {
  const session = await event.locals.auth();

  if (session?.user?.id) {
    const storedKeys = await getApiKeys(session.user.id);

    const keys: ApiKeys = {
      mistral: storedKeys.some((key) => key.provider === AIProvider.Mistral),
      eleven: storedKeys.some((key) => key.provider === AIProvider.ElevenLabs),
      openai: storedKeys.some((key) => key.provider === AIProvider.OpenAI)
    };

    return {
      session,
      keys
    };
  }

  return {
    session,
    keys: null
  };
}) satisfies LayoutServerLoad;
