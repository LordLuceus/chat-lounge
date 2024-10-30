import { AgentType, Visibility } from "$lib/drizzle/schema";
import { createAgent } from "$lib/server/agents-service";
import { fail } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { agentSchema } from "./schema";

export const load = (async () => {
  return {
    form: await superValidate(zod(agentSchema))
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

    const { name, description, instructions, visibility, type, greeting } = form.data;
    const agent = await createAgent({
      userId: userId!,
      name,
      description,
      instructions,
      visibility: visibility as Visibility,
      type: type as AgentType,
      greeting
    });

    return message(form, { agentId: agent.id, created: true });
  }
};
