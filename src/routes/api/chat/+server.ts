import MistralClient from "@mistralai/mistralai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { MISTRAL_API_KEY } from "$env/static/private";
import type { RequestHandler } from "@sveltejs/kit";

export const config = { runtime: "edge" };

const mistral = new MistralClient(MISTRAL_API_KEY);

export const POST = (async ({ request }) => {
  const { messages } = await request.json();
  const response = await mistral.chatStream({ messages, model: "mistral-large-latest" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = OpenAIStream(response as any);

  return new StreamingTextResponse(stream);
}) satisfies RequestHandler;
