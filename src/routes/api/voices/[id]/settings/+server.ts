import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import { AIProvider } from "$lib/types/db";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ locals, params }) => {
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

  const client = new ElevenLabsClient({ apiKey: apiKey.key });

  const voiceSettings = await client.voices.settings.get(id);

  return json(voiceSettings);
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
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

  const body = await request.json();

  const client = new ElevenLabsClient({ apiKey: apiKey.key });

  const voiceSettings = await client.voices.settings.update(id, body);

  return json(voiceSettings);
};
