import { ALL_PROVIDERS } from "$lib/helpers/api-key-utils";
import { getApiKeys } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return redirect(307, "/auth/sign-in");
  }

  const [storedKeys, user] = await Promise.all([getApiKeys(userId), getUser(userId)]);
  const availableProviders = new Set(storedKeys.map((key) => key.provider));

  const keys = ALL_PROVIDERS.reduce(
    (acc, provider) => {
      acc[provider] = availableProviders.has(provider);
      return acc;
    },
    {} as Record<string, boolean>
  );

  return {
    keys,
    isAdmin: user?.isAdmin ?? false
  };
}) satisfies LayoutServerLoad;
