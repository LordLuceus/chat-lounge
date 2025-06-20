import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { withClerkHandler } from "svelte-clerk/server";

export const handle: Handle = sequence(
  withClerkHandler({
    signInUrl: "/auth/sign-in",
    signUpUrl: "/auth/sign-up"
  })
);
