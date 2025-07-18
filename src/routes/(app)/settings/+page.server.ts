import { saveApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import { AIProvider } from "$lib/types/db";
import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions: Actions = {
  apiKey: async ({ locals, request, url }) => {
    const { userId } = locals.auth();
    const formData = await request.formData();
    const provider = url.searchParams.get("provider");

    if (!provider) {
      return fail(400, { message: "Missing provider" });
    }

    const apiKey = formData.get("apiKey") as string;

    if (!userId) {
      return fail(401, { message: "Unauthorized" });
    }

    const user = await getUser(userId);

    if (!user) {
      return fail(401, { message: "Unauthorized" });
    }

    await saveApiKey(apiKey, user.id, provider as AIProvider);

    return { success: true };
  }
};
