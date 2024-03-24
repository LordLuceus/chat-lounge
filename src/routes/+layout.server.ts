import { AIProvider } from "$lib/drizzle/schema";
import { getAgents } from "$lib/server/agents-service";
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

    const agents = await getAgents(session.user.id);

    return {
      session,
      keys,
      agents
    };
  }

  return {
    session
  };
}) satisfies LayoutServerLoad;
