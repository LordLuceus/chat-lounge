import { env } from "$env/dynamic/public";
import { checkForUpdates, setVersion } from "$lib/helpers/check-for-updates";
import type { HandleClientError } from "@sveltejs/kit";
import { initializeClerkClient } from "clerk-sveltekit/client";

initializeClerkClient(env.PUBLIC_CLERK_PUBLISHABLE_KEY, {
  afterSignInUrl: "/",
  afterSignUpUrl: "/",
  signInUrl: "/auth/sign-in",
  signUpUrl: "/auth/sign-up"
});

setVersion();
checkForUpdates();

export const handleError: HandleClientError = async ({ error, event }) => {
  console.error(error, event);
};
