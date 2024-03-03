import prisma from "$lib/prisma";
import type { LayoutServerLoad } from "./$types";

export const load = (async (event) => {
  const session = await event.locals.getSession();

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: session?.user?.id }
  });

  return {
    session,
    hasApiKeys: apiKeys.length > 0
  };
}) satisfies LayoutServerLoad;
