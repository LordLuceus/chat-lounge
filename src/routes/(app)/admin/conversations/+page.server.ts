import { requireAdmin } from "$lib/server/admin";
import { getAdminConversations, getAdminFilterOptions } from "$lib/server/admin-service";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  await requireAdmin(locals);

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const filters = {
    user: url.searchParams.get("user") || "",
    model: url.searchParams.get("model") || "",
    q: url.searchParams.get("q")?.trim() || ""
  };

  const [result, options] = await Promise.all([
    getAdminConversations({
      page,
      userId: filters.user || undefined,
      modelId: filters.model || undefined,
      search: filters.q || undefined
    }),
    getAdminFilterOptions()
  ]);

  return { page, filters, options, ...result };
};
