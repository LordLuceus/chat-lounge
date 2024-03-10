import prisma from "$lib/prisma";
import type { LayoutServerLoad } from "./$types";

interface ApiKeys {
  mistral: boolean;
  eleven: boolean;
  openai: boolean;
}

export const load = (async (event) => {
  const session = await event.locals.auth();

  if (session?.user?.id) {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: session?.user?.id }
    });

    if (!apiKeys) {
      return {
        session,
        keys: null
      };
    }

    const keys: ApiKeys = {
      mistral: apiKeys.some((key) => key.provider === "MISTRAL"),
      eleven: apiKeys.some((key) => key.provider === "ELEVENLABS"),
      openai: apiKeys.some((key) => key.provider === "OPENAI")
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
