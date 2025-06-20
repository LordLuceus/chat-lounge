import { getSharedConversation } from "$lib/server/conversations-service";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async (event) => {
  const { id } = event.params;

  const conversation = await getSharedConversation(id);

  if (!conversation) {
    return error(404, "Conversation not found");
  }

  return { conversation };
}) satisfies PageServerLoad;
