import { getFolder } from "$lib/server/folders-service";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async (event) => {
  const { id } = event.params;
  const { userId } = event.locals.auth();

  if (!userId) {
    return redirect(307, "/auth/sign-in");
  }

  const folder = await getFolder(userId, id);

  if (!folder) {
    return error(404, "Folder not found");
  }

  return {
    folder
  };
}) satisfies PageServerLoad;
