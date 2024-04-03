import MistralClient from "@mistralai/mistralai";
import { MistralStream, StreamingTextResponse } from "ai";

export async function getMistralResponse(
  apiKey: string,
  messages: { role: string; content: string }[],
  model: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    provider: string;
    tokenLimit: number;
  }
) {
  const client = new MistralClient(apiKey);

  const response = await client.chatStream({
    messages,
    model: model.id,
    temperature: 1.0
  });

  const stream = MistralStream(response);

  return new StreamingTextResponse(stream);
}
