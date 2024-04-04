import { getAgents, saveAgent } from "$lib/server/agents-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { fail } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { formSchema } from "./schema";

export const config: Config = { runtime: "edge" };

export const load = (async ({ locals }) => {
  const { userId } = locals.session!;

  return {
    form: await superValidate(zod(formSchema)),
    agents: await getAgents(userId!)
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async (event) => {
    if (!event.locals.session) {
      return fail(401, { message: "Unauthorized" });
    }

    const { userId } = event.locals.session;

    const form = await superValidate(event, zod(formSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const { name, description, instructions } = form.data;
    await saveAgent({ userId: userId!, name, description, instructions });

    return message(form, "Agent created");
  }
};
