import { ElevenLabsClient } from "elevenlabs-edge";
import { error } from "@sveltejs/kit";
import { getApiKey } from "$lib/settings/api-keys";
import { getPreferences } from "$lib/settings/preferences";
import prisma from "$lib/prisma";
import type { RequestHandler } from "@sveltejs/kit";
import type { Config } from "@sveltejs/adapter-vercel";

export const config: Config = { runtime: "edge" };

export const POST = (async ({ request }) => {
  const { text, userId } = await request.json();

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user) {
      return error(404, { message: "User not found" });
    }

    const apiKey = await getApiKey(user.id, "ELEVENLABS");

    if (!apiKey) {
      return error(404, { message: "API key not found" });
    }

    const eleven = new ElevenLabsClient({ apiKey: apiKey.key });

    const preferences = await getPreferences(user.id);

    const voice = preferences?.defaultVoiceId || (await eleven.voices.getAll()).voices[0].voice_id;
    const response = await eleven.generate({
      text,
      voice,
      model_id: "eleven_turbo_v2",
      stream: true
    });
    return new Response(response);
  } catch (e) {
    console.error(e);
    throw error(500, { message: "An error occurred while fetching text to speech" });
  }
}) satisfies RequestHandler;
