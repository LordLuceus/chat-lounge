import { getSharedConversation, shareConversation } from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, params }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
  }

  const { userId } = locals.session;

  const { id } = params;

  if (!id) {
    return error(400, "No conversation ID provided");
  }

  const sharedConversationId = await shareConversation(id, userId);

  return json({ id: sharedConversationId });
}) satisfies RequestHandler;

export const GET = (async ({ params }) => {
  const { id } = params;

  if (!id) {
    return error(400, "No conversation ID provided");
  }

  const sharedConversation = await getSharedConversation(id);

  return json(sharedConversation);
}) satisfies RequestHandler;
