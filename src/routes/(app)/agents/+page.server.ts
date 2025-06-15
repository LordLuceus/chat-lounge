import { createAgent } from "$lib/server/agents-service";
import { AgentType, Visibility } from "$lib/types/db";
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
    const { userId } = locals.auth();
    if (!userId) {
      return fail(401, { message: "Unauthorized" });
    }

    const form = await superValidate(request, zod(agentSchema), { strict: true });

    if (!form.valid) {
      return fail(400, { form });
    }

    const { name, description, instructions, visibility, type, greeting } = form.data;
    const agentId = await createAgent({
      userId,
      name,
      description,
      instructions,
      visibility: visibility as Visibility,
      type: type as AgentType,
      greeting
    });

    return message(form, { agentId, created: true });
  }
};
