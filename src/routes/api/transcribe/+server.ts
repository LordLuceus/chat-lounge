import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import { AIProvider } from "$lib/types/db";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { error, text, type RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const user = await getUser(userId);

  if (!user) return error(404, "User not found");

  const apiKey = await getApiKey(user.id, AIProvider.ElevenLabs);

  if (!apiKey) return error(404, "No ElevenLabs API key found");

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!audio) return error(400, "No audio file provided");

  if (!(audio instanceof File)) return error(400, "Invalid audio file");

  const elevenLabs = new ElevenLabsClient({ apiKey: apiKey.key });

  const transcription = await elevenLabs.speechToText.convert({
    file: audio,
    modelId: "scribe_v1",
    tagAudioEvents: true,
    languageCode: "en",
    diarize: true
  });

  const result = "text" in transcription ? transcription.text : "";

  if (!result) return error(500, "Transcription failed");

  return text(result, { status: 200 });
}) satisfies RequestHandler;
