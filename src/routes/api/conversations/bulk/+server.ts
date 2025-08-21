import {
  bulkAddToFolder,
  bulkDeleteConversations,
  bulkRemoveFromFolder,
  bulkShareConversations,
  bulkTogglePinConversations,
  bulkUnshareConversations
} from "$lib/server/conversations-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

interface BulkRequest {
  ids: string[];
  action: string;
  folderId?: string;
}

export const DELETE = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const data: BulkRequest = await request.json();

  if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
    return error(400, "Invalid or empty ids array");
  }

  try {
    const result = await bulkDeleteConversations(userId, data.ids);
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete conversations";
    return error(500, message);
  }
}) satisfies RequestHandler;

export const PUT = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const data: BulkRequest = await request.json();

  if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
    return error(400, "Invalid or empty ids array");
  }

  if (!data.action) {
    return error(400, "Action is required");
  }

  try {
    switch (data.action) {
      case "pin":
        return json(await bulkTogglePinConversations(userId, data.ids, true));

      case "unpin":
        return json(await bulkTogglePinConversations(userId, data.ids, false));

      case "addToFolder":
        if (!data.folderId) {
          return error(400, "folderId is required for addToFolder action");
        }
        return json(await bulkAddToFolder(userId, data.ids, data.folderId));

      case "removeFromFolder":
        return json(await bulkRemoveFromFolder(userId, data.ids));

      case "share":
        return json(await bulkShareConversations(userId, data.ids));

      case "unshare":
        return json(await bulkUnshareConversations(userId, data.ids));

      default:
        return error(400, `Unknown action: ${data.action}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to perform bulk operation";
    return error(500, message);
  }
}) satisfies RequestHandler;
