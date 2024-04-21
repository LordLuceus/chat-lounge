import { getConversation } from "$lib/server/conversations-service";
import { getUserModels } from "$lib/server/models-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async (event) => {
  const { id } = event.params;
  const { userId } = event.locals.session!;

  const conversation = await getConversation(userId!, id);

  if (!conversation) {
    return error(404, "Conversation not found");
  }

  if (conversation.agentId) {
    redirect(302, `/agents/${conversation.agentId}/conversations/${id}`);
  }

  return { conversation, models: await getUserModels(userId!) };
}) satisfies PageServerLoad;
