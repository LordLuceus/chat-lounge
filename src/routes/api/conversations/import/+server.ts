import { createConversation, type MessageImport } from "$lib/server/conversations-service";
import { importQueue } from "$lib/server/queue";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const { modelId, data }: { modelId: string; data: MessageImport[] } = await request.json();

  if (!modelId) {
    return error(400, "No model ID provided");
  }

  const assistantMessage = data.find((m) => m.role === "assistant");

  if (!assistantMessage) {
    return error(400, "Failed to import chat; no assistant message found");
  }

  let agentId = assistantMessage.senderId;
  if (agentId === undefined) {
    agentId = null;
  }

  const conversation = await createConversation({
    name: "Imported Chat",
    agentId,
    modelId,
    userId,
    messages: [],
    isImporting: true
  });

  if (!conversation) {
    return error(500, "Failed to create conversation");
  }

  await importQueue.add("import-queue", {
    data,
    conversationId: conversation.id,
    userId,
    modelId
  });

  return json(conversation);
}) satisfies RequestHandler;
