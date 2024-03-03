import type { Actions } from "./$types";
import prisma from "$lib/prisma";
import { saveApiKey } from "$lib/api-keys";
import { fail } from "@sveltejs/kit";

export const actions: Actions = {
  default: async (event) => {
    const formData = await event.request.formData();
    const mistralApiKey = formData.get("mistralApiKey") as string;

    const session = await event.locals.getSession();

    if (!session?.user) {
      return fail(401, { message: "Unauthorized" });
    }

    try {
      const user = await prisma.user.findFirstOrThrow({ where: { email: session.user.email } });
      if (!user) {
        return fail(401, { message: "Unauthorized" });
      }

      await saveApiKey(mistralApiKey, user.id, "MISTRAL");

      return { success: true };
    } catch (e) {
      return fail(500, { message: "Internal Server Error" });
    }
  }
};
