import { getConversation, updateConversation } from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const PUT = (async ({ locals, params }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
  }

  const { userId } = locals.session;
  const { id } = params;

  if (!id) {
    return error(400, "No conversation ID provided");
  }

  const conversation = await getConversation(userId, id);

  if (!conversation) {
    return error(404, "Conversation not found");
  }

  await updateConversation(id, { isPinned: !conversation.isPinned }, userId);

  return json({ message: "Successfully toggled pinned status." });
}) satisfies RequestHandler;
