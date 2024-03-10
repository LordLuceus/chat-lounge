import type { Actions } from "./$types";
import prisma from "$lib/prisma";
import { saveApiKey } from "$lib/api-keys";
import { fail } from "@sveltejs/kit";
import { AIProvider } from "@prisma/client";

export const actions: Actions = {
  apiKey: async ({ locals, request, url }) => {
    const formData = await request.formData();
    const provider = url.searchParams.get("provider");

    if (!provider) {
      return fail(400, { message: "Missing provider" });
    }

    if (!(provider in AIProvider)) {
      return fail(400, { message: "Invalid provider" });
    }

    const apiKey = formData.get("apiKey") as string;

    const session = await locals.auth();

    if (!session?.user) {
      return fail(401, { message: "Unauthorized" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: session.user?.id } });

      if (!user) {
        return fail(401, { message: "Unauthorized" });
      }

      await saveApiKey(apiKey, user.id, provider as AIProvider);

      return { success: true };
    } catch (e) {
      console.error(e);
      return fail(500, { message: "Internal Server Error" });
    }
  }
};
