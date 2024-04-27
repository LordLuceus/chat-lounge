import type { Agent } from "$lib/drizzle/schema";
import { QueryParamsProcessor } from "$lib/query-params-processor";
import { createAgent, getAgents, type AgentCreateOptions } from "$lib/server/agents-service";
import type { PagedResponse } from "$lib/types/api/paged-response";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const config: Config = { runtime: "edge" };

export const GET = (async ({ locals, url }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;

  const page = Number(url.searchParams.get("page")) || 1;
  const pageSize = Number(url.searchParams.get("limit")) || 10;

  const paramsProcessor = new QueryParamsProcessor(Object.fromEntries(url.searchParams));

  const { limit, offset } = paramsProcessor.getPagination();
  const search = paramsProcessor.getSearchQuery(["name"]);
  const sortBy = paramsProcessor.getSorting("conversation");

  const result = await getAgents(userId, limit, offset, sortBy, search);

  return json({
    data: result.agents,
    meta: { page, pageSize, total: result.total, totalPages: Math.ceil(result.total! / pageSize) }
  } as PagedResponse<Agent>);
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const data: AgentCreateOptions = await request.json();
  data.userId = userId;

  return json(await createAgent(data), { status: 201 });
}) satisfies RequestHandler;
