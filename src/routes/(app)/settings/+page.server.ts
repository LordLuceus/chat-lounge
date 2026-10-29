import { ALL_PROVIDERS } from "$lib/helpers/api-key-utils";
import { ApiKeyEncryptionError } from "$lib/server/api-key-crypto";
import { MAX_API_KEY_LENGTH, saveApiKey } from "$lib/server/api-keys-service";
import { getUser, updateUserSettings } from "$lib/server/users-service";
import type { AIProvider } from "$lib/types/db";
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

    if (!provider || !(ALL_PROVIDERS as readonly string[]).includes(provider)) {
      return fail(400, { message: "Unknown provider" });
    }

    const apiKey = formData.get("apiKey");

    if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return fail(400, { message: "Please enter an API key" });
    }

    if (apiKey.trim().length > MAX_API_KEY_LENGTH) {
      return fail(400, { message: "That API key is too long" });
    }

    if (!userId) {
      return fail(401, { message: "Unauthorized" });
    }

    const user = await getUser(userId);

    if (!user) {
      return fail(401, { message: "Unauthorized" });
    }

    try {
      await saveApiKey(apiKey.trim(), user.id, provider as AIProvider);
    } catch (err) {
      if (err instanceof ApiKeyEncryptionError) {
        // A deployment problem, not the user's: never echo the key or the secret.
        console.error("[api-keys] Could not save API key:", err.message);
        return fail(500, {
          message: "API keys cannot be saved right now. Please try again later."
        });
      }
      throw err;
    }

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
