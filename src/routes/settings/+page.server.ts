import { db } from "$lib/drizzle/db";
import { AIProvider, users } from "$lib/drizzle/schema";
import { saveApiKey } from "$lib/settings/api-keys";
import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions } from "./$types";

export const actions: Actions = {
  apiKey: async ({ locals, request, url }) => {
    const formData = await request.formData();
    const provider = url.searchParams.get("provider");

    if (!provider) {
      return fail(400, { message: "Missing provider" });
    }

    const apiKey = formData.get("apiKey") as string;

    const session = await locals.auth();

    if (!session?.user) {
      return fail(401, { message: "Unauthorized" });
    }

    const user = (await db.select().from(users).where(eq(users.id, session.user.id!))).at(0);

    if (!user) {
      return fail(401, { message: "Unauthorized" });
    }

    await saveApiKey(apiKey, user.id, provider as AIProvider);

    return { success: true };
  }
};
