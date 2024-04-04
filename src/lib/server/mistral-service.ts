import MistralClient from "@mistralai/mistralai";
import { MistralStream, StreamingTextResponse } from "ai";

export async function getMistralResponse(
  apiKey: string,
  messages: { role: string; content: string }[],
  modelId: string,
  prompt?: string
) {
  const client = new MistralClient(apiKey);

  if (prompt) {
    messages.unshift({ role: "system", content: prompt });
  }

  const response = await client.chatStream({
    messages,
    model: modelId,
    temperature: 1.0
  });

  const stream = MistralStream(response);

  return new StreamingTextResponse(stream);
}
