import { error } from "@sveltejs/kit";

import { importChat } from "$lib/server/conversations-service";
import { json, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
  }

  const { userId } = locals.session;

  const { modelId, data } = await request.json();

  if (!modelId) {
    return error(400, "No model ID provided");
  }

  const conversation = await importChat(userId, modelId, data);

  if (!conversation) {
    return error(400, "Failed to import chat");
  }

  return json(conversation);
}) satisfies RequestHandler;
