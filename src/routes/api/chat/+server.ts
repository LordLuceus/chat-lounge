import MistralClient from "@mistralai/mistralai";
import { MistralStream, StreamingTextResponse } from "ai";
import prisma from "$lib/prisma";
import { error, type RequestHandler } from "@sveltejs/kit";
import { getApiKey } from "$lib/settings/api-keys";

export const config = { runtime: "edge" };

export const POST = (async ({ request }) => {
  const { messages, userId } = await request.json();

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, "MISTRAL");

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  const client = new MistralClient(apiKey.key);

  const response = await client.chatStream({
    messages,
    model: "mistral-medium",
    temperature: 1.0
  });

  const stream = MistralStream(response, {
    onCompletion: async (message) => console.log({ completion: message }),
    onToken: async (token) => console.log({ token })
  });

  return new StreamingTextResponse(stream);
}) satisfies RequestHandler;
