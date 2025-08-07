import { ALL_PROVIDERS } from "$lib/helpers/api-key-utils";
import { getApiKeys } from "$lib/server/api-keys-service";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return redirect(307, "/auth/sign-in");
  }

  const storedKeys = await getApiKeys(userId);
  const availableProviders = new Set(storedKeys.map((key) => key.provider));

  const keys = ALL_PROVIDERS.reduce(
    (acc, provider) => {
      acc[provider] = availableProviders.has(provider);
      return acc;
    },
    {} as Record<string, boolean>
  );

  return {
    keys
  };
}) satisfies LayoutServerLoad;
