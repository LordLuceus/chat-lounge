import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
  }

  const { userId } = locals.session;

  const { modelId, data } = await request.json();

  if (!modelId) {
    return error(400, "No model ID provided");
  }

  // Placeholder for importing conversations
  return json({ userId, data });
}) satisfies RequestHandler;
