import { getUserModels } from "$lib/server/models-service";
import type { Config } from "@sveltejs/adapter-vercel";
import type { PageServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async ({ locals }) => {
  const { userId } = locals.session!;

  return { models: await getUserModels(userId!) };
}) satisfies PageServerLoad;
