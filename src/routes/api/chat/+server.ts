import { AIProvider } from "$lib/drizzle/schema";
import { getAgent } from "$lib/server/agents-service";
import { getApiKey } from "$lib/server/api-keys-service";
import { getMistralResponse } from "$lib/server/mistral-service";
import { getModel } from "$lib/server/models-service";
import { getOpenAIResponse } from "$lib/server/openai-service";
import { getUser } from "$lib/server/users-service";
import { error, type RequestHandler } from "@sveltejs/kit";

export const config = { runtime: "edge" };

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) {
    return error(401, { message: "Unauthorized" });
  }

  const { messages, modelId, agentId } = await request.json();
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
  }

  if (model.provider === "mistral") {
    return getMistralResponse(apiKey.key, messages, model.id, agent?.instructions);
  }

  if (model.provider === "openai") {
    return getOpenAIResponse(apiKey.key, messages, model.id, agent?.instructions);
  }

  return error(500, { message: "Invalid model provider" });
}) satisfies RequestHandler;
