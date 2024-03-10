import { ElevenLabsClient } from "elevenlabs-edge";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { ELEVENLABS_API_KEY } from "$env/static/private";
import type { Config } from "@sveltejs/adapter-vercel";

const eleven = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

export const config: Config = { runtime: "edge" };

export const POST = (async ({ request }) => {
  const { text } = await request.json();

  try {
    const response = await eleven.generate({
      text,
      voice: "Stephen",
      model_id: "eleven_multilingual_v2",
      stream: true
    });
    return new Response(response);
  } catch (e) {
    console.error(e);
    throw error(500, { message: "An error occurred while fetching text to speech" });
  }
}) satisfies RequestHandler;
