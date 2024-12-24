import { deleteSharedConversation, getSharedConversation } from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ params }) => {
  const { id } = params;

  if (!id) {
    return error(400, "No conversation ID provided");
  }

  const conversation = await getSharedConversation(id);

  if (!conversation) {
    return error(404, "Conversation not found");
  }

  return json(conversation);
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, params }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
  }

  const { id } = params;
  const { userId } = locals.session;

  if (!id) {
    return error(400, "No conversation ID provided");
  }

  await deleteSharedConversation(id, userId);

  return json({ message: "Conversation deleted" });
}) satisfies RequestHandler;
