import type { Handle } from "@sveltejs/kit";
import { withClerkHandler } from "svelte-clerk/server";

export const handle: Handle = withClerkHandler({
  signInUrl: "/auth/sign-in",
  signUpUrl: "/auth/sign-up"
});
