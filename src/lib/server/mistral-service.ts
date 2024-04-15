import { addConversationMessage } from "$lib/server/conversations-service";
import MistralClient from "@mistralai/mistralai";
import { MistralStream, StreamingTextResponse } from "ai";

export async function getMistralResponse(
  apiKey: string,
  messages: { role: string; content: string }[],
  modelId: string,
  userId: string,
  agent?: { id: string; instructions: string },
  conversationId?: string
) {
  const client = new MistralClient(apiKey);

  if (agent) {
    messages.unshift({ role: "system", content: agent.instructions });
  }

  const response = await client.chatStream({
    messages,
    model: modelId,
    temperature: 1.0
  });

  const stream = MistralStream(response, {
    onStart: () => {
      if (conversationId) {
        addConversationMessage(conversationId, messages.at(-1)?.content as string, "user", userId);
      }
    },
    onCompletion: (completion: string) => {
      if (conversationId) {
        addConversationMessage(conversationId, completion, "assistant");
      }
    }
  });

  return new StreamingTextResponse(stream);
}
