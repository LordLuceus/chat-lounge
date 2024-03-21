import { db } from "$lib/drizzle/db";
import { AIProvider, apiKeys } from "$lib/drizzle/schema";
import type { Config } from "@sveltejs/adapter-vercel";
import { eq } from "drizzle-orm";
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
    const storedKeys = await db.select().from(apiKeys).where(eq(apiKeys.userId, session.user.id));

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
