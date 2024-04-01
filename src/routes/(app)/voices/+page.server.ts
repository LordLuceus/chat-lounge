import { loadUserData } from "$lib/helpers/load-user-data";
import type { PageServerLoad } from "./$types";

export const load = (async (event) => {
  return loadUserData(event, { voices: true });
}) satisfies PageServerLoad;
