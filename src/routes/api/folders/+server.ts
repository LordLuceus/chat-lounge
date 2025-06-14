import { QueryParamsProcessor } from "$lib/query-params-processor";
import { createFolder, getFolders } from "$lib/server/folders-service";
import type { PagedResponse } from "$lib/types/api";
import type { Folder } from "@prisma/client";
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

  const result = await getFolders(
    userId,
    limit,
    offset,
    sorting?.sortBy || "updatedAt",
    sorting?.sortOrder || "DESC",
    search
  );

  return json({
    data: result.folders,
    meta: { page, pageSize, total: result.total, totalPages: Math.ceil(result.total! / pageSize) }
  } as PagedResponse<Folder>);
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const data = await request.json();
  data.userId = userId;

  return json(await createFolder(data), { status: 201 });
}) satisfies RequestHandler;
