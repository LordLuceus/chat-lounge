import { removeFromFolder } from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, params, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;
  const data = await request.json();

  return json(await removeFromFolder(userId, data.conversationId, id!));
}) satisfies RequestHandler;
