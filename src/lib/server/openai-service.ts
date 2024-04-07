import { OpenAIStream, StreamingTextResponse } from "ai";
import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";

export async function getOpenAIResponse(
  apiKey: string,
  messages: ChatCompletionMessageParam[],
  modelId: string,
  prompt?: string
) {
  const client = new OpenAI({ apiKey });

  if (prompt) {
    messages.unshift({ role: "system", content: prompt });
  }

  const response = await client.chat.completions.create({
    messages,
    model: modelId,
    temperature: 1.0,
    stream: true
  });

  const stream = OpenAIStream(response);

  return new StreamingTextResponse(stream);
}
