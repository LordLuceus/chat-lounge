import { env } from "$env/dynamic/private";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { handleClerk } from "clerk-sveltekit/server";

export const handle: Handle = sequence(
  handleClerk(env.CLERK_SECRET_KEY, {
    protectedPaths: [
      ({ url }) => {
        if (
          url.pathname.startsWith("/api/webhooks") ||
          url.pathname.startsWith("/auth") ||
          url.pathname.startsWith("/changelog") ||
          url.pathname.startsWith("/conversations/shared") ||
          url.pathname.startsWith("/api/conversations/shared")
        ) {
          return false;
        }
        return true;
      }
    ],
    signInUrl: "/auth/sign-in"
  })
);
