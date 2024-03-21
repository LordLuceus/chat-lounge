import type { Voice } from "$lib/types/elevenlabs/voices";
import type { Config } from "@sveltejs/adapter-vercel";
import type { PageServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async ({ fetch, parent }) => {
  const { session } = await parent();

  if (!session) {
    return {};
  }

  const response = await fetch("/api/voices?userId=" + session?.user?.id);

  if (response.ok) {
    return {
      voices: (await response.json()) as Voice[]
    };
  }

  return {};
}) satisfies PageServerLoad;
