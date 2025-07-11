import { getAgent, updateAgent, type AgentCreateOptions } from "$lib/server/agents-service.js";
import { error, fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { agentSchema } from "../../schema";
import type { Actions, PageServerLoad } from "./$types";

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

  const formData = {
    ...agent,
    description: agent.description ?? undefined,
    greeting: agent.greeting ?? undefined
  };

  return {
    agent,
    editForm: await superValidate(formData, zod(agentSchema), { id: agent.id })
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async (event) => {
    const { userId } = event.locals.auth();
    if (!userId) {
      return fail(401, { message: "Unauthorized" });
    }

    const form = await superValidate(event, zod(agentSchema), { strict: true });

    if (!form.valid) {
      return fail(400, { form });
    }

    await updateAgent(form.id, form.data as AgentCreateOptions);
    return message(form, "Agent updated successfully");
  }
};
