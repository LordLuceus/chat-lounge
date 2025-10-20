import { getAgent, updateLastUsed } from "$lib/server/agents-service";
import AIService from "$lib/server/ai-service";
import { getApiKey } from "$lib/server/api-keys-service";
import { getConversation, updateConversation } from "$lib/server/conversations-service";
import { getModel } from "$lib/server/models-service";
import { getPresignedUrl } from "$lib/server/r2-storage";
import { getUser } from "$lib/server/users-service";
import { AIProvider } from "$lib/types/db";
import { error, type RequestHandler } from "@sveltejs/kit";
import type { FileUIPart } from "ai";

export const POST = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, { message: "Unauthorized" });
  }

  const {
    messages,
    modelId,
    agentId,
    conversationId,
    regenerate,
    editedMessageId: messageId,
    thinking,
    storageParts
  } = await request.json();

  // Process messages for storage and AI
  const processedMessages = await Promise.all(
    messages.map(async (msg: { role: string; parts?: unknown[] }) => {
      if (!msg.parts) return msg;

      const processedParts = await Promise.all(
        msg.parts.map(async (part: unknown) => {
          const typedPart = part as {
            type: string;
            key?: string;
            url?: string;
            mediaType?: string;
            filename?: string;
          };

          // If part has R2 key (from DB), generate fresh presigned URL
          if (typedPart.type === "file" && typedPart.key) {
            // Verify user owns this file
            if (!typedPart.key.startsWith(`${userId}/`)) {
              throw error(403, "Unauthorized access to file");
            }

            // Generate 24-hour presigned URL for AI processing
            const presignedUrl = await getPresignedUrl(typedPart.key, 86400);

            // Convert to FileUIPart format for AI
            const filePart: FileUIPart = {
              type: "file",
              url: presignedUrl,
              mediaType: typedPart.mediaType || "image/png",
              filename: typedPart.filename
            };
            return filePart;
          }

          // If part already has URL (new message with fresh presigned URL), use it as-is
          return part;
        })
      );

      return { ...msg, parts: processedParts };
    })
  );

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

  return aiService.run(
    processedMessages,
    model,
    userId,
    agent,
    conversationId,
    regenerate,
    messageId,
    thinking,
    storageParts
  );
}) satisfies RequestHandler;
