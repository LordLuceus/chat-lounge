import { getAgent } from "$lib/server/agents-service";
import { getConversation } from "$lib/server/conversations-service";
import { getUserModelsGroupedByProvider } from "$lib/server/models-service";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async (event) => {
  const { id, conversationId } = event.params;
  const { userId } = event.locals.auth();

  if (!userId) {
    return redirect(307, "/auth/sign-in");
  }

  const agent = await getAgent(userId, id);

  if (!agent) {
    return error(404, "Agent not found");
  }

  const conversation = await getConversation(userId, conversationId);

  if (!conversation) {
    return error(404, "Conversation not found");
  }

  return { agent, conversation, modelGroups: await getUserModelsGroupedByProvider(userId) };
}) satisfies PageServerLoad;
