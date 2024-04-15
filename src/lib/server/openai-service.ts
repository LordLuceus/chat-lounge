import { addConversationMessage } from "$lib/server/conversations-service";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";

export async function getOpenAIResponse(
  apiKey: string,
  messages: ChatCompletionMessageParam[],
  modelId: string,
  userId: string,
  agent?: { id: string; instructions: string },
  conversationId?: string
) {
  const client = new OpenAI({ apiKey });

  if (agent) {
    messages.unshift({ role: "system", content: agent.instructions });
  }

  const response = await client.chat.completions.create({
    messages,
    model: modelId,
    temperature: 1.0,
    stream: true
  });

  const stream = OpenAIStream(response, {
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
