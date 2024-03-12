import { ElevenLabsClient } from "elevenlabs-edge";
import prisma from "$lib/prisma";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { getApiKey } from "$lib/settings/api-keys";

export const config: Config = { runtime: "edge" };

export const GET: RequestHandler = async ({ locals, params }) => {
  const { id } = params;
  const session = await locals.auth();

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: session?.user?.id
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

    const voice = await eleven.voices.get(id as string);

    return json(voice);
  } catch (e) {
    console.error(e);
    throw error(500, { message: "Internal server error" });
  }
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const { id } = params;
  const session = await locals.auth();

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: session?.user?.id
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

    await eleven.voices.deleteV1Voices(id as string);

    return json({ message: "Voice deleted" });
  } catch (e) {
    console.error(e);
    throw error(500, { message: "Internal server error" });
  }
};
