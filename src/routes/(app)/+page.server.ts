import { getUserModels } from "$lib/server/models-service";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { userId } = locals.auth();

  if (!userId) {
    return error(401, "Unauthorized: User not found");
  }
  return { models: await getUserModels(userId) };
}) satisfies PageServerLoad;
