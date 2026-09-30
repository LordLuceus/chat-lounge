import { getUser } from "$lib/server/users-service";
import { error } from "@sveltejs/kit";

/**
 * Throws 404 unless the signed-in user is an admin. 404 rather than 403 so
 * the admin area isn't advertised to other users.
 */
export async function requireAdmin(locals: App.Locals) {
  const { userId } = locals.auth();

  if (!userId) {
    error(404, "Not found");
  }

  const user = await getUser(userId);

  if (!user?.isAdmin) {
    error(404, "Not found");
  }

  return user;
}
