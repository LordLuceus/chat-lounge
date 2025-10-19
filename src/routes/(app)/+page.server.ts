import { getUserModelsGroupedByProvider } from "$lib/server/models-service";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { userId } = locals.auth();

  if (!userId) {
    return redirect(307, "/auth/sign-in");
  }
  return { modelGroups: await getUserModelsGroupedByProvider(userId) };
}) satisfies PageServerLoad;
