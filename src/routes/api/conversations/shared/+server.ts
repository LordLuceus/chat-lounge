import { QueryParamsProcessor } from "$lib/query-params-processor";
import { getSharedConversations } from "$lib/server/conversations-service";
import type { SharedConversation } from "$lib/server/db";
import type { PagedResponse } from "$lib/types/api";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, url }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
  }

  const { userId } = locals.session;
  const page = Number(url.searchParams.get("page")) || 1;
  const pageSize = Number(url.searchParams.get("limit")) || 10;

  const paramsProcessor = new QueryParamsProcessor(Object.fromEntries(url.searchParams));

  const { limit, offset } = paramsProcessor.getPagination();
  const search = paramsProcessor.getSearchQuery(["name"]);
  const sortBy = paramsProcessor.getSorting("sharedConversation");

  const result = await getSharedConversations(userId, limit, offset, sortBy, search);

  return json({
    data: result.conversations,
    meta: { page, pageSize, total: result.total, totalPages: Math.ceil(result.total! / pageSize) }
  } as PagedResponse<SharedConversation>);
}) satisfies RequestHandler;
