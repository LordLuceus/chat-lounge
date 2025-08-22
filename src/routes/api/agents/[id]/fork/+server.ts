import { forkAgent } from "$lib/server/agents-service.js";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const POST: RequestHandler = async ({ locals, request, params }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id: sourceAgentId } = params;
  const body = await request.json();
  const { name } = body;

  try {
    const forkedAgent = await forkAgent(userId, sourceAgentId, name);
    return json({ agent: forkedAgent });
  } catch (err) {
    console.error("Fork agent error:", err);
    return error(400, err instanceof Error ? err.message : "Failed to fork agent");
  }
};
