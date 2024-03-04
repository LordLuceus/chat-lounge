import prisma from "$lib/prisma";
import type { LayoutServerLoad } from "./$types";

export const load = (async (event) => {
  const session = await event.locals.getSession();

  if (session?.user?.id) {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: session?.user?.id }
    });

    return {
      session,
      hasApiKeys: apiKeys.length > 0
    };
  }

  return {
    session,
    hasApiKeys: false
  };
}) satisfies LayoutServerLoad;
