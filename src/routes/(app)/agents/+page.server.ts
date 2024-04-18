import { createAgent, getAgents } from "$lib/server/agents-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { fail } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { agentSchema } from "./schema";

export const config: Config = { runtime: "edge" };

export const load = (async ({ locals }) => {
  const { userId } = locals.session!;

  return {
    form: await superValidate(zod(agentSchema)),
    agents: await getAgents(userId!)
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async ({ locals, request }) => {
    if (!locals.session) {
      return fail(401, { message: "Unauthorized" });
    }

    const { userId } = locals.session;

    const form = await superValidate(request, zod(agentSchema), { strict: true });

    if (!form.valid) {
      return fail(400, { form });
    }

    const { name, description, instructions } = form.data;
    const agent = await createAgent({ userId: userId!, name, description, instructions });

    return message(form, { agentId: agent.at(0)?.id, created: true });
  }
};
