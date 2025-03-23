import { QueryParamsProcessor } from "$lib/query-params-processor";
import {
  createConversation,
  getConversations,
  type ConversationCreateOptions
} from "$lib/server/conversations-service";
import type { PagedResponse } from "$lib/types/api";
import type { Conversation } from "@prisma/client";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, url }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;

  const page = Number(url.searchParams.get("page")) || 1;
  const pageSize = Number(url.searchParams.get("limit")) || 10;

  const paramsProcessor = new QueryParamsProcessor(Object.fromEntries(url.searchParams));

  const { limit, offset } = paramsProcessor.getPagination();
  const search = paramsProcessor.getSearchQuery();
  const sorting = paramsProcessor.getSorting();
  const folderId = paramsProcessor.getFolderId();

  const result = await getConversations(
    userId,
    limit,
    offset,
    sorting?.sortBy || "lastUpdated",
    sorting?.sortOrder || "DESC",
    search,
    folderId
  );

  return json({
    data: result.conversations,
    meta: { page, pageSize, total: result.total, totalPages: Math.ceil(result.total! / pageSize) }
  } as PagedResponse<Conversation>);
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const data: ConversationCreateOptions = await request.json();
  data.userId = userId;

  return json(await createConversation(data), { status: 201 });
}) satisfies RequestHandler;
