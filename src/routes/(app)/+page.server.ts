import { loadUserData } from "$lib/helpers/load-user-data";
import type { Config } from "@sveltejs/adapter-vercel";
import type { PageServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async (event) => {
  return loadUserData(event);
}) satisfies PageServerLoad;
