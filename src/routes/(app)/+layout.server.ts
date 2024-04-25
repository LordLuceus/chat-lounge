import { AIProvider } from "$lib/drizzle/schema";
import { getApiKeys } from "$lib/server/api-keys-service";
import type { Config } from "@sveltejs/adapter-vercel";
import type { LayoutServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async ({ locals, fetch }) => {
  const { userId } = locals.session!;
  const storedKeys = await getApiKeys(userId!);

  const keys = {
    mistral: storedKeys.some((key) => key.provider === AIProvider.Mistral),
    eleven: storedKeys.some((key) => key.provider === AIProvider.ElevenLabs),
    openai: storedKeys.some((key) => key.provider === AIProvider.OpenAI)
  };

  const recentAgentsResponse = await fetch("/api/agents?recent=true");

  return {
    keys,
    agents: await recentAgentsResponse.json()
  };
}) satisfies LayoutServerLoad;
