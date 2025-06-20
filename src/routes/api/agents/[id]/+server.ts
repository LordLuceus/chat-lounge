import {
  deleteAgent,
  getAgent,
  updateAgent,
  type AgentCreateOptions
} from "$lib/server/agents-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;

  return json(await getAgent(userId, id!));
}) satisfies RequestHandler;

export const PUT = (async ({ locals, params, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;
  const data: Partial<AgentCreateOptions> = await request.json();

  return json(await updateAgent(id!, data, userId));
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;

  return json(await deleteAgent(userId, id!));
}) satisfies RequestHandler;
