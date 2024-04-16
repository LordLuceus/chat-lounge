import { loadUserData } from "$lib/helpers/load-user-data";
import { getAgent } from "$lib/server/agents-service";
import { getConversation } from "$lib/server/conversations-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async (event) => {
  const { id, conversationId } = event.params;
  const { userId } = event.locals.session!;

  const agent = await getAgent(userId!, id);

  if (!agent) {
    return error(404, "Agent not found");
  }

  const conversation = await getConversation(userId!, conversationId);

  if (!conversation) {
    return error(404, "Conversation not found");
  }

  const { models, voices } = await loadUserData(event);

  return { agent, conversation, models, voices };
}) satisfies PageServerLoad;
