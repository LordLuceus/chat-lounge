import { db } from "$lib/drizzle/db";
import { AIProvider, users } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/settings/api-keys";
import MistralClient from "@mistralai/mistralai";
import { error, type RequestHandler } from "@sveltejs/kit";
import { MistralStream, StreamingTextResponse } from "ai";
import { eq } from "drizzle-orm";

export const config = { runtime: "edge" };

export const POST = (async ({ request }) => {
  const { messages, model, userId } = await request.json();

  const user = (await db.select().from(users).where(eq(users.id, userId))).at(0);

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
