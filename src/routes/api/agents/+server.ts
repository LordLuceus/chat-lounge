import { QueryParamsProcessor } from "$lib/query-params-processor";
import {
  createAgent,
  getAgents,
  type AgentCreateOptions,
  type AgentWithUsage
} from "$lib/server/agents-service";
import type { PagedResponse } from "$lib/types/api";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, url }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const page = Number(url.searchParams.get("page")) || 1;
  const pageSize = Number(url.searchParams.get("limit")) || 10;

  const paramsProcessor = new QueryParamsProcessor(Object.fromEntries(url.searchParams));

  const { limit, offset } = paramsProcessor.getPagination();
  const search = paramsProcessor.getSearchQuery();
  const sorting = paramsProcessor.getSorting();
  const visibility = paramsProcessor.getVisibility();
  const ownerOnly = paramsProcessor.getOwnerOnly();

  const result = await getAgents(
    userId,
    limit,
    offset,
    sorting?.sortBy || "lastUsedAt",
    sorting?.sortOrder || "DESC",
    search,
    visibility,
    ownerOnly
  );

  return json({
    data: result.agents,
    meta: { page, pageSize, total: result.total, totalPages: Math.ceil(result.total! / pageSize) }
  } as PagedResponse<AgentWithUsage>);
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const data: AgentCreateOptions = await request.json();
  data.userId = userId;

  return json(await createAgent(data), { status: 201 });
}) satisfies RequestHandler;
