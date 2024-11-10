import { error, json, type RequestHandler } from "@sveltejs/kit";
import { tasks } from "@trigger.dev/sdk/v3";
import type { importChatTask } from "../../../../trigger/import-chat";

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
  }

  const { userId } = locals.session;

  const { modelId, data } = await request.json();

  if (!modelId) {
    return error(400, "No model ID provided");
  }

  const handle = await tasks.trigger<typeof importChatTask>("import-chat", {
    userId,
    modelId,
    data
  });

  return json(handle);
}) satisfies RequestHandler;
