import { bulkDeleteFolders } from "$lib/server/folders-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

interface BulkRequest {
  ids: string[];
  action: string;
}

export const DELETE = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const data: BulkRequest = await request.json();

  if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
    return error(400, "Invalid or empty ids array");
  }

  try {
    const result = await bulkDeleteFolders(userId, data.ids);
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete folders";
    return error(500, message);
  }
}) satisfies RequestHandler;
