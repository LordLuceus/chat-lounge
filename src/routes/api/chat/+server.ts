import MistralClient from "@mistralai/mistralai";
import { MistralStream, StreamingTextResponse } from "ai";
import prisma from "$lib/prisma";
import type { RequestHandler } from "@sveltejs/kit";
import { getApiKey } from "$lib/api-keys";

export const config = { runtime: "edge" };

export const POST = (async ({ request }) => {
  const { messages, userEmail } = await request.json();

  const user = await prisma.user.findFirst({
    where: {
      email: userEmail
    }
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const apiKey = await getApiKey(user.id, "MISTRAL");

  if (!apiKey) {
    return new Response("API key not found", { status: 404 });
  }

  const client = new MistralClient(apiKey.key);

  const response = await client.chatStream({
    messages,
    model: "mistral-medium",
    temperature: 1.0
  });

  const stream = MistralStream(response);

  return new StreamingTextResponse(stream);
}) satisfies RequestHandler;
