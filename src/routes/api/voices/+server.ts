import type { RequestHandler } from "./$types";
import { ElevenLabsClient } from "elevenlabs-edge";
import prisma from "$lib/prisma";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, json } from "@sveltejs/kit";
import { getApiKey } from "$lib/api-keys";

export const config: Config = { runtime: "edge" };

export const GET: RequestHandler = async ({ locals }) => {
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

    const voices = await eleven.voices.getAll();

    // Sort voices by category
    const result = voices.voices.toSorted((a, b) => {
      if (a.category < b.category) {
        return -1; // a comes first
      }
      if (a.category > b.category) {
        return 1; // b comes first
      }
      return 0; // a and b are equal
    });

    return json(result);
  } catch (e) {
    console.error(e);
    throw error(500, { message: "Internal server error" });
  }
};
