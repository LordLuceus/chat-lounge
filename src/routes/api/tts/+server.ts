import { error } from "@sveltejs/kit";
import { getApiKey } from "$lib/settings/api-keys";
import prisma from "$lib/prisma";
import { PUBLIC_ELEVENLABS_BASE_URL } from "$env/static/public";
import type { RequestHandler } from "@sveltejs/kit";
import type { Config } from "@sveltejs/adapter-vercel";
import type { ElevenLabsError } from "$lib/types/elevenlabs/elevenlabs-error";

export const config: Config = { runtime: "edge" };

export const POST = (async ({ request }) => {
  const { stream, text, voice, userId } = await request.json();

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

  if (!voice) {
    return error(400, { message: "No voice provided" });
  }

  const response = await fetch(
    `${PUBLIC_ELEVENLABS_BASE_URL}/text-to-speech/${voice}${stream ? "/stream" : ""}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey.key
      },
      body: JSON.stringify({ text, model_id: "eleven_turbo_v2" })
    }
  );

  if (!response.ok) {
    const result: ElevenLabsError = await response.json();

    console.log(result);
    return error(response.status, result.detail.message);
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "audio/mpeg"
    }
  });
}) satisfies RequestHandler;
