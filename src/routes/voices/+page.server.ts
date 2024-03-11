import type { VoiceResponse } from "elevenlabs-edge/dist/api";
import type { PageServerLoad } from "./$types";

export const load = (async ({ fetch }) => {
  const res = await fetch("/api/voices");
  const voices: VoiceResponse[] = await res.json();
  return { voices };
}) satisfies PageServerLoad;
