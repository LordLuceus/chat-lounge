import { saveApiKey } from "$lib/server/api-keys-service";
import { getUser, updateUserSettings } from "$lib/server/users-service";
import { AIProvider } from "$lib/types/db";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const { userId } = locals.auth();

  if (!userId) {
    return fail(401, { message: "Unauthorized" });
  }

  const user = await getUser(userId);

  if (!user) {
    return fail(401, { message: "Unauthorized" });
  }

  return {
    useBaseInstructions: user.useBaseInstructions,
    customBaseInstructions: user.customBaseInstructions
  };
};

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
  },

  baseInstructions: async ({ locals, request }) => {
    const { userId } = locals.auth();
    const formData = await request.formData();

    if (!userId) {
      return fail(401, { message: "Unauthorized" });
    }

    const user = await getUser(userId);

    if (!user) {
      return fail(401, { message: "Unauthorized" });
    }

    const useBaseInstructions = formData.get("useBaseInstructions") === "true";
    const customBaseInstructions = formData.get("customBaseInstructions") as string;

    // Clean up custom instructions - if empty or just whitespace, set to null
    const cleanCustomInstructions =
      customBaseInstructions && customBaseInstructions.trim()
        ? customBaseInstructions.trim()
        : null;

    try {
      await updateUserSettings(user.id, {
        useBaseInstructions,
        customBaseInstructions: cleanCustomInstructions
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to update base instructions settings:", error);
      return fail(500, { message: "Failed to save base instructions settings" });
    }
  }
};
