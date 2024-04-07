import { deleteAgent, getAgent } from "$lib/server/agents-service.js";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, fail, redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { deleteSchema } from "../../schema";
import type { Actions, PageServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async (event) => {
  const { id } = event.params;
  const { userId } = event.locals.session!;

  const agent = await getAgent(userId!, id);

  if (!agent) {
    return error(404, "Agent not found");
  }

  return {
    agent,
    deleteForm: await superValidate(zod(deleteSchema))
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async (event) => {
    if (!event.locals.session) {
      return fail(401, { message: "Unauthorized" });
    }

    const { userId } = event.locals.session;

    const form = await superValidate(event, zod(deleteSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    await deleteAgent(userId!, form.data.id);

    return redirect(303, "/");
  }
};
