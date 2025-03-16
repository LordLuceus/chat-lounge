import { createFolder } from "$lib/server/folders-service";
import { fail } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { folderSchema } from "./schema";

export const load = (async () => {
  return {
    form: await superValidate(zod(folderSchema))
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async ({ locals, request }) => {
    if (!locals.session) {
      return fail(401, { message: "Unauthorized" });
    }

    const { userId } = locals.session;

    const form = await superValidate(request, zod(folderSchema), { strict: true });

    if (!form.valid) {
      return fail(400, { form });
    }

    const { name } = form.data;
    const folder = await createFolder({
      userId: userId!,
      name
    });

    return message(form, { folderId: folder.id, created: true });
  }
};
