import { AIProvider } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import MistralClient from "@mistralai/mistralai";
import { error, type RequestHandler } from "@sveltejs/kit";
import { MistralStream, StreamingTextResponse } from "ai";

export const config = { runtime: "edge" };

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) {
    return error(401, { message: "Unauthorized" });
  }

  const { messages, model } = await request.json();
  const { userId } = locals.session;

  const user = await getUser(userId);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, AIProvider.Mistral);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  const client = new MistralClient(apiKey.key);

  const response = await client.chatStream({
    messages,
    model,
    temperature: 1.0
  });

  const stream = MistralStream(response);

  return new StreamingTextResponse(stream);
}) satisfies RequestHandler;
