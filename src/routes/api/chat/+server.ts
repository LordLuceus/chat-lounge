import { AIProvider } from "$lib/drizzle/schema";
import { getAgent, updateLastUsed } from "$lib/server/agents-service";
import AIService from "$lib/server/ai-service";
import { getApiKey } from "$lib/server/api-keys-service";
import { getModel } from "$lib/server/models-service";
import { getUser } from "$lib/server/users-service";
import { error, type RequestHandler } from "@sveltejs/kit";

export const config = { runtime: "edge" };

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) {
    return error(401, { message: "Unauthorized" });
  }

  const { messages, modelId, agentId, conversationId } = await request.json();
  const { userId } = locals.session;

  const user = await getUser(userId);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const model = await getModel(modelId);

  if (!model) {
    return error(404, { message: "Model not found" });
  }

  const apiKey = await getApiKey(user.id, model.provider as AIProvider);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  let agent;

  if (agentId) {
    agent = await getAgent(userId, agentId);

    if (!agent) {
      return error(404, { message: "Agent not found" });
    }
    updateLastUsed(userId, agent.id);
  }

  const aiService = new AIService(model.provider, apiKey.key);

  return aiService.getResponse(messages, model.id, userId, agent, conversationId);
}) satisfies RequestHandler;
