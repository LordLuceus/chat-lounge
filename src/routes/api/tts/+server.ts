import { PUBLIC_ELEVENLABS_BASE_URL } from "$env/static/public";
import { db } from "$lib/drizzle/db";
import { AIProvider, users } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/settings/api-keys";
import type { ElevenLabsError } from "$lib/types/elevenlabs/elevenlabs-error";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const config: Config = { runtime: "edge" };

export const POST = (async ({ request }) => {
  const { stream, text, voice, userId } = await request.json();

  const user = (await db.select().from(users).where(eq(users.id, userId))).at(0);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, AIProvider.ElevenLabs);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  if (!voice) {
    return error(400, { message: "No voice provided" });
  }

  const response = await fetch(
    `${PUBLIC_ELEVENLABS_BASE_URL}/text-to-speech/${voice}${stream ? "/stream" : ""}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey.key
      },
      body: JSON.stringify({ text, model_id: "eleven_turbo_v2" })
    }
  );

  if (!response.ok) {
    const result: ElevenLabsError = await response.json();

    return error(response.status, result.detail.message);
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "audio/mpeg"
    }
  });
}) satisfies RequestHandler;
