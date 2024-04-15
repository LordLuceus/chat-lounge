import { loadUserData } from "$lib/helpers/load-user-data";
import { getConversation } from "$lib/server/conversations-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async (event) => {
  const { id } = event.params;
  const { userId } = event.locals.session!;

  const conversation = await getConversation(userId!, id);

  if (!conversation) {
    return error(404, "Conversation not found");
  }

  const { models, voices } = await loadUserData(event);

  return { conversation, models, voices };
}) satisfies PageServerLoad;
