import { setModel } from "$lib/helpers";
import AIService from "$lib/server/ai-service";
import { getApiKey } from "$lib/server/api-keys-service";
import { getConversation } from "$lib/server/conversations-service";
import { getModel } from "$lib/server/models-service";
import { AIProvider } from "$lib/types/db";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, "Unauthorized");
  }
  const conversationId = params.id;

  if (!conversationId) return error(400, "Conversation ID is required");

  const conversation = await getConversation(userId, conversationId);
  if (!conversation) {
    return error(404, "Conversation not found");
  }

  const model = await getModel(conversation.modelId!);
  if (!model) {
    return error(404, "Model not found");
  }

  const apiKey = await getApiKey(userId, model.provider as AIProvider);
  if (!apiKey) {
    return error(404, "API key not found");
  }

  const aiService = new AIService(model.provider as AIProvider, apiKey.key);
  const context = conversation.messages.map((m) => ({ role: m.role, content: m.content }));

  const followupModelId = setModel(apiKey, model.id);

  const suggestions = await aiService.generateFollowUps(context, followupModelId);

  return json(suggestions);
}) satisfies RequestHandler;
