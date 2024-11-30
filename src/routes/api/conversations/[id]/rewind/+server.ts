import { rewindConversation } from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, params, request }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
  }

  const { id } = params;
  const { userId } = locals.session;

  const { messageId } = await request.json();

  if (!messageId) {
    return error(400, "No message ID provided");
  }

  if (!id) {
    return error(400, "No conversation ID provided");
  }

  await rewindConversation(id, userId, messageId);

  return json({ message: "Conversation rewound" });
}) satisfies RequestHandler;
