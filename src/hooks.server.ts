import { dev } from "$app/environment";
import type { Handle, ServerInit } from "@sveltejs/kit";
import { withClerkHandler } from "svelte-clerk/server";

export const init: ServerInit = async () => {
  // The queue connects to the Docker-only Redis host, so only schedule in production.
  // In development, use "Sync now" on the admin models page instead.
  if (dev) return;

  try {
    const { scheduleModelSync } = await import("$lib/server/queue");
    await scheduleModelSync();
  } catch (err) {
    console.error("[model-sync] Could not schedule daily sync:", err);
  }
};

export const handle: Handle = withClerkHandler({
  signInUrl: "/auth/sign-in",
  signUpUrl: "/auth/sign-up"
});
