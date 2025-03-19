import { env } from "$env/dynamic/public";
import { getApiKey } from "$lib/server/api-keys-service";
import { AIProvider } from "$lib/server/db";
import { getUser } from "$lib/server/users-service";
import type { ElevenLabsError, Voices } from "$lib/types/elevenlabs";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals }) => {
  if (!locals.session?.userId) {
    return error(401, { message: "Unauthorized" });
  }

  const { userId } = locals.session;

  const user = await getUser(userId);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, AIProvider.ElevenLabs);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  const response = await fetch(`${env.PUBLIC_ELEVENLABS_BASE_URL}/voices`, {
    headers: { "xi-api-key": apiKey.key }
  });

  if (!response.ok) {
    const result: ElevenLabsError = await response.json();

    return error(response.status, result.detail.message);
  }

  const voices: Voices = await response.json();
  // Sort voices by category
  const result = voices.voices.toSorted((a, b) => {
    if (a.category < b.category) {
      return -1; // a comes first
    }
    if (a.category > b.category) {
      return 1; // b comes first
    }
    return 0; // a and b are equal
  });

  return json(result);
}) satisfies RequestHandler;
