import type { Voice } from "$lib/types/elevenlabs/voices";
import type { PageServerLoad } from "./$types";

export const load = (async ({ fetch, parent }) => {
  const { session } = await parent();

  const res = await fetch("/api/voices?userId=" + session?.user?.id);
  return { voices: (await res.json()) as Voice[] };
}) satisfies PageServerLoad;
