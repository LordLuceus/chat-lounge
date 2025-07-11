import { env } from "$env/dynamic/public";
import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import { AIProvider } from "$lib/types/db";
import type { ElevenLabsError } from "$lib/types/elevenlabs";
import { ModelID } from "$lib/types/elevenlabs";
import { error, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const { stream, text, voice, modelId } = await request.json();

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
    `${env.PUBLIC_ELEVENLABS_BASE_URL}/text-to-speech/${voice}${stream ? "/stream" : ""}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey.key
      },
      body: JSON.stringify({ text, model_id: modelId ?? ModelID.ElevenTurboV2 }),
      signal: request.signal
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
