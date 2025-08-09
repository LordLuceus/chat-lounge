import { getUserModels } from "$lib/server/models-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ locals, url }) => {
  const { userId } = locals.auth();

  if (!userId) {
    return error(401, "Unauthorized");
  }

  const searchText = url.searchParams.get("search") ?? undefined;

  try {
    const models = await getUserModels(userId, searchText);
    return json(models);
  } catch (err) {
    console.error("Failed to fetch user models:", err);
    return error(500, "Internal Server Error");
  }
};
