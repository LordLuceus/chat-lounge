import {
  getConversationMessage,
  updateConversationMessage
} from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const { id, messageId } = params;

  if (!id || !messageId) {
    return error(400, "No message ID provided");
  }

  const message = await getConversationMessage(id, messageId);

  if (!message) {
    return error(404, "Message not found");
  }

  return json(message);
}) satisfies RequestHandler;

export const PUT = (async ({ locals, params, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const { id, messageId } = params;

  if (!id || !messageId) {
    return error(400, "No message ID provided");
  }

  const { content } = await request.json();

  if (!content) {
    return error(400, "No content provided");
  }

  await updateConversationMessage(id, messageId, { content });

  return json({ message: "Message updated" });
}) satisfies RequestHandler;
