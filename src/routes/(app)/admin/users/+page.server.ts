import { requireAdmin } from "$lib/server/admin";
import { getAdminUsers, setUserAdmin } from "$lib/server/admin-service";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  const admin = await requireAdmin(locals);
  const search = url.searchParams.get("q")?.trim() || undefined;

  return {
    currentUserId: admin.id,
    search: search ?? "",
    users: await getAdminUsers(search)
  };
};

export const actions: Actions = {
  setAdmin: async ({ locals, request }) => {
    const admin = await requireAdmin(locals);
    const formData = await request.formData();
    const id = formData.get("id");
    const isAdmin = formData.get("isAdmin") === "true";

    if (typeof id !== "string" || !id) {
      return fail(400, { message: "Missing user ID" });
    }

    if (id === admin.id) {
      return fail(400, { message: "You can't change your own admin access." });
    }

    const user = await setUserAdmin(id, isAdmin);

    return {
      message: isAdmin
        ? `${user.username} is now an admin.`
        : `${user.username} is no longer an admin.`
    };
  }
};
