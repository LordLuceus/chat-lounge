import { db } from "$lib/drizzle/db";
import { AIProvider, users } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/server/api-keys-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, text, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { OpenAI } from "openai";

export const config: Config = { runtime: "edge" };

export const POST = (async ({ request, url }) => {
  const userId = url.searchParams.get("userId");

  if (!userId) return error(400, "No user ID provided");

  const user = (await db.select().from(users).where(eq(users.id, userId))).at(0);

  if (!user) return error(404, "User not found");

  const apiKey = await getApiKey(user.id, AIProvider.OpenAI);

  if (!apiKey) return error(404, "No OpenAI API key found");

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!audio) return error(400, "No audio file provided");

  if (!(audio instanceof File)) return error(400, "Invalid audio file");

  const openai = new OpenAI({ apiKey: apiKey.key });

  const transcript = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    response_format: "text"
  });

  // The type definition for OpenAI's API is incorrect. It returns a string, not an object. What the hell?
  return text(transcript as unknown as string);
}) satisfies RequestHandler;
