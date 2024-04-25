import {
  deleteConversation,
  getConversation,
  updateConversation
} from "$lib/server/conversations-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const config: Config = { runtime: "edge" };

export const GET = (async ({ locals, params }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;

  return json(await getConversation(userId, id!));
}) satisfies RequestHandler;

export const PUT = (async ({ locals, params, request }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;
  const { currentNode, name } = await request.json();

  return json(await updateConversation(id!, { currentNode, name }, userId));
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, params }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;

  return json(await deleteConversation(userId, id!));
}) satisfies RequestHandler;
