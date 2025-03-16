import { addToFolder } from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, params, request }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;
  const data = await request.json();

  return json(await addToFolder(userId, data.conversationId, id!));
}) satisfies RequestHandler;
