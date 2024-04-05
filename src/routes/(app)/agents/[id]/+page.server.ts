import { loadUserData } from "$lib/helpers/load-user-data";
import { deleteAgent, getAgent, saveAgent } from "$lib/server/agents-service.js";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { agentSchema, deleteSchema } from "../schema";
import type { Actions, PageServerLoad } from "./$types";

export const config: Config = { runtime: "edge" };

export const load = (async (event) => {
  const { id } = event.params;
  const { userId } = event.locals.session!;

  const agent = await getAgent(userId!, id);

  if (!agent) {
    return error(404, "Agent not found");
  }

  const { models, voices } = await loadUserData(event);

  const formData = { ...agent, description: agent.description ?? undefined };

  return {
    agent,
    models,
    voices,
    editForm: await superValidate(formData, zod(agentSchema)),
    deleteForm: await superValidate(zod(deleteSchema))
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  edit: async (event) => {
    if (!event.locals.session) {
      return fail(401, { message: "Unauthorized" });
    }

    const { userId } = event.locals.session;

    const form = await superValidate(event, zod(agentSchema), { strict: true });

    if (!form.valid) {
      return fail(400, { form });
    }

    const { name, description, instructions } = form.data;
    await saveAgent({ userId: userId!, name, description, instructions });

    console.log(`Updated agent ${form.data.name}`);
    return message(form, "Agent updated");
  },
  delete: async (event) => {
    if (!event.locals.session) {
      return fail(401, { message: "Unauthorized" });
    }

    const { userId } = event.locals.session;

    const form = await superValidate(event, zod(deleteSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    await deleteAgent(userId!, form.data.id);

    console.log(`Deleted agent ${form.data.id}`);
    return redirect(303, "/");
  }
};
