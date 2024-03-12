import { type Handle, redirect } from "@sveltejs/kit";
import { handle as authenticationHandle } from "$lib/auth";
import { sequence } from "@sveltejs/kit/hooks";

const authorizationHandle = (async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/settings") || event.url.pathname.startsWith("/voices")) {
    const session = await event.locals.auth();

    if (!session) throw redirect(303, "/");
  }

  return resolve(event);
}) satisfies Handle;

export const handle: Handle = sequence(authenticationHandle, authorizationHandle);
