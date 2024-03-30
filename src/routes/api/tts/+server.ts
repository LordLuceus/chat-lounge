import { PUBLIC_ELEVENLABS_BASE_URL } from "$env/static/public";
import { AIProvider } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import type { ElevenLabsError } from "$lib/types/elevenlabs/elevenlabs-error";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, type RequestHandler } from "@sveltejs/kit";

export const config: Config = { runtime: "edge" };

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
  }

  const { stream, text, voice } = await request.json();
  const { userId } = locals.session;

  const user = await getUser(userId);

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
