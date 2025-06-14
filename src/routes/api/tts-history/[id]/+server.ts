import { env } from "$env/dynamic/public";
import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import { AIProvider } from "$lib/types/db";
import type { ElevenLabsError } from "$lib/types/elevenlabs";
import { error, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, request, params }) => {
  const { id } = params;
  const { userId } = locals.auth();

  if (!userId) {
    return error(401, "Unauthorized");
  }

  const user = await getUser(userId);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, AIProvider.ElevenLabs);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  const response = await fetch(`${env.PUBLIC_ELEVENLABS_BASE_URL}/history/${id}/audio`, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey.key
    },
    signal: request.signal
  });

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

export const DELETE = (async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const { id } = params;

  if (!id) {
    return error(400, "No history item ID provided");
  }

  const user = await getUser(userId);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, AIProvider.ElevenLabs);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  const response = await fetch(`${env.PUBLIC_ELEVENLABS_BASE_URL}/history/${id}`, {
    method: "DELETE",
    headers: {
      "xi-api-key": apiKey.key
    }
  });

  if (!response.ok) {
    const result: ElevenLabsError = await response.json();

    return error(response.status, result.detail.message);
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}) satisfies RequestHandler;
