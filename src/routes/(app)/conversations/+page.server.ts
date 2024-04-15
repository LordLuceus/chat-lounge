import { getConversations } from "$lib/server/conversations-service";
import type { Config } from "@sveltejs/adapter-vercel";
import type { PageServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async ({ locals }) => {
  const { userId } = locals.session!;
  return {
    conversations: await getConversations(userId!)
  };
}) satisfies PageServerLoad;
