import { ElevenLabsClient } from "elevenlabs-edge";
import { error } from "@sveltejs/kit";
import { getApiKey } from "$lib/api-keys";
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
      return new Response("User not found", { status: 404 });
    }

    const apiKey = await getApiKey(user.id, "ELEVENLABS");

    if (!apiKey) {
      return new Response("API key not found", { status: 404 });
    }

    const eleven = new ElevenLabsClient({ apiKey: apiKey.key });

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
