import {
  createAgent,
  getAgents,
  getRecentAgents,
  type AgentCreateOptions
} from "$lib/server/agents-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const config: Config = { runtime: "edge" };

export const GET = (async ({ locals, url }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;

  if (url.searchParams.has("recent")) return json(await getRecentAgents(userId));

  return json(await getAgents(userId));
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const data: AgentCreateOptions = await request.json();
  data.userId = userId;

  return json(await createAgent(data), { status: 201 });
}) satisfies RequestHandler;
