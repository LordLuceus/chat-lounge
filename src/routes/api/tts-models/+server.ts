import { env } from "$env/dynamic/public";
import { AIProvider } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import type { ElevenLabsError, ElevenLabsModel } from "$lib/types/elevenlabs";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, request }) => {
  if (!locals.session?.userId) {
    return error(401, "Unauthorized");
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

  const response = await fetch(`${env.PUBLIC_ELEVENLABS_BASE_URL}/models`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey.key
    },
    signal: request.signal
  });

  if (!response.ok) {
    const result: ElevenLabsError = await response.json();

    return error(response.status, result.detail.message);
  }

  const result: ElevenLabsModel[] = await response.json();

  return json(result);
}) satisfies RequestHandler;
