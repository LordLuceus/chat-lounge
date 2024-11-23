import { env } from "$env/dynamic/public";
import { AIProvider } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import type { ElevenLabsError } from "$lib/types/elevenlabs";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.session?.userId) {
    return error(401, { message: "Unauthorized" });
  }

  const { id } = params;
  const { userId } = locals.session;

  if (!id) {
    return error(400, { message: "No voice ID provided" });
  }

  const user = await getUser(userId);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, AIProvider.ElevenLabs);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  const response = await fetch(`${env.PUBLIC_ELEVENLABS_BASE_URL}/voices/${id}`, {
    method: "DELETE",
    headers: { "xi-api-key": apiKey.key }
  });

  if (!response.ok) {
    const result: ElevenLabsError = await response.json();
    return error(response.status, result.detail.message);
  }

  return json({ message: "Voice deleted" });
};
