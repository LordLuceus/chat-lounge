import { AIProvider } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, text, type RequestHandler } from "@sveltejs/kit";
import { OpenAI } from "openai";

export const config: Config = { runtime: "edge" };

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;

  const user = await getUser(userId);

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
