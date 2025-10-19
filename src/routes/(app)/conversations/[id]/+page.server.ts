import { getConversation } from "$lib/server/conversations-service";
import { getUserModelsGroupedByProvider } from "$lib/server/models-service";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async (event) => {
  const { id } = event.params;
  const { userId } = event.locals.auth();

  if (!userId) {
    return redirect(307, "/auth/sign-in");
  }

  const conversation = await getConversation(userId, id);

  if (!conversation) {
    return error(404, "Conversation not found");
  }

  if (conversation.agentId) {
    redirect(302, `/agents/${conversation.agentId}/conversations/${id}`);
  }

  return { conversation, modelGroups: await getUserModelsGroupedByProvider(userId!) };
}) satisfies PageServerLoad;
