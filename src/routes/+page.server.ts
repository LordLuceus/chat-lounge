import type { VoiceResponse } from "elevenlabs-edge/dist/api";
import type { PageServerLoad } from "./$types";
import type { Config } from "@sveltejs/adapter-vercel";

export const config: Config = { runtime: "edge" };

export const load = (async ({ fetch, parent }) => {
  const { session } = await parent();

  if (!session) {
    return { status: 401, redirect: "/login" };
  }

  const response = await fetch("/api/voices");

  if (response.ok) {
    return {
      voices: (await response.json()) as VoiceResponse[]
    };
  }

  return {};
}) satisfies PageServerLoad;
