import { getAgent } from "$lib/server/agents-service.js";
import { getUserModels } from "$lib/server/models-service";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async (event) => {
  const { id } = event.params;
  const { userId } = event.locals.session!;

  const agent = await getAgent(userId!, id);

  if (!agent) {
    return error(404, "Agent not found");
  }

  return {
    agent,
    models: await getUserModels(userId!)
  };
}) satisfies PageServerLoad;
