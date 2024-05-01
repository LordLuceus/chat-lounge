import {
  deleteAgent,
  getAgent,
  updateAgent,
  type AgentCreateOptions
} from "$lib/server/agents-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const config: Config = { runtime: "edge" };

export const GET = (async ({ locals, params }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;

  return json(await getAgent(userId, id!));
}) satisfies RequestHandler;

export const PUT = (async ({ locals, params, request }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;
  const data: Partial<AgentCreateOptions> = await request.json();

  return json(await updateAgent(id!, data, userId));
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, params }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;

  return json(await deleteAgent(userId, id!));
}) satisfies RequestHandler;
