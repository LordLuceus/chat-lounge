import { getUserModels } from "$lib/server/models-service";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { userId } = locals.session!;

  return { models: await getUserModels(userId!) };
}) satisfies PageServerLoad;
