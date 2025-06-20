import { getAgent, updateLastUsed } from "$lib/server/agents-service";
import AIService from "$lib/server/ai-service";
import { getApiKey } from "$lib/server/api-keys-service";
import { getConversation, updateConversation } from "$lib/server/conversations-service";
import { getModel } from "$lib/server/models-service";
import { getUser } from "$lib/server/users-service";
import { AIProvider } from "$lib/types/db";
import { error, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, { message: "Unauthorized" });
  }

  const { messages, modelId, agentId, conversationId, regenerate, messageId } =
    await request.json();

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

  if (conversationId) {
    const conversation = await getConversation(userId, conversationId);

    if (!conversation) {
      return error(404, { message: "Conversation not found" });
    }

    if (modelId !== conversation.modelId) {
      updateConversation(conversationId, { modelId }, userId);
    }
  }

  const aiService = new AIService(model.provider as AIProvider, apiKey.key);

  return aiService.run(messages, model, userId, agent, conversationId, regenerate, messageId);
}) satisfies RequestHandler;
