import { getAgent } from "$lib/server/agents-service.js";
import { getUserModels } from "$lib/server/models-service";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async (event) => {
  const { id } = event.params;
  const { userId } = event.locals.auth();

  if (!userId) {
    return redirect(307, "/auth/sign-in");
  }

  const agent = await getAgent(userId, id);

  if (!agent) {
    return error(404, "Agent not found");
  }

  return {
    agent,
    models: await getUserModels(userId)
  };
}) satisfies PageServerLoad;
