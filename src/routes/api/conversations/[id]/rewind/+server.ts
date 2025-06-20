import { rewindConversation } from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, params, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const { id } = params;

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
