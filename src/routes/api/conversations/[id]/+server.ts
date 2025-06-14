import {
  deleteConversation,
  getConversation,
  updateConversation
} from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;

  return json(await getConversation(userId, id!));
}) satisfies RequestHandler;

export const PUT = (async ({ locals, params, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;
  const { currentNode, name } = await request.json();

  return json(await updateConversation(id!, { currentNode, name }, userId));
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;

  return json(await deleteConversation(userId, id!));
}) satisfies RequestHandler;
