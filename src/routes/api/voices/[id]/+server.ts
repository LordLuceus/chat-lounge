import { PUBLIC_ELEVENLABS_BASE_URL } from "$env/static/public";
import { db } from "$lib/drizzle/db";
import { AIProvider, users } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/settings/api-keys";
import type { ElevenLabsError } from "$lib/types/elevenlabs/elevenlabs-error";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const config: Config = { runtime: "edge" };

export const DELETE: RequestHandler = async ({ params, url }) => {
  const { id } = params;
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return error(400, { message: "No user ID provided" });
  }

  if (!id) {
    return error(400, { message: "No voice ID provided" });
  }

  const user = (await db.select().from(users).where(eq(users.id, userId))).at(0);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, AIProvider.ElevenLabs);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  const response = await fetch(`${PUBLIC_ELEVENLABS_BASE_URL}/voices/${id}`, {
    method: "DELETE",
    headers: { "xi-api-key": apiKey.key }
  });

  if (!response.ok) {
    const result: ElevenLabsError = await response.json();
    return error(response.status, result.detail.message);
  }

  return json({ message: "Voice deleted" });
};
