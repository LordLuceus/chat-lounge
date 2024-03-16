import type { VoiceResponse } from "elevenlabs-edge/dist/api";
import type { PageServerLoad } from "./$types";
import type { Config } from "@sveltejs/adapter-vercel";

export const config: Config = { runtime: "edge" };

export const load = (async ({ fetch }) => {
  const response = await fetch("/api/voices");

  if (response.ok) {
    return {
      voices: (await response.json()) as VoiceResponse[]
    };
  }

  return {};
}) satisfies PageServerLoad;
