import { PUBLIC_ELEVENLABS_BASE_URL } from "$env/static/public";
import { db } from "$lib/drizzle/db";
import { AIProvider, users } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/settings/api-keys";
import type { ElevenLabsError } from "$lib/types/elevenlabs/elevenlabs-error";
import type { Voices } from "$lib/types/elevenlabs/voices";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const config: Config = { runtime: "edge" };

export const GET = (async ({ url }) => {
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return error(400, { message: "No user ID provided" });
  }

  const user = (await db.select().from(users).where(eq(users.id, userId))).at(0);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, AIProvider.ElevenLabs);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  const response = await fetch(`${PUBLIC_ELEVENLABS_BASE_URL}/voices`, {
    headers: { "xi-api-key": apiKey.key }
  });

  if (!response.ok) {
    const result: ElevenLabsError = await response.json();

    return error(response.status, result.detail.message);
  }

  const voices: Voices = await response.json();
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
}) satisfies RequestHandler;
