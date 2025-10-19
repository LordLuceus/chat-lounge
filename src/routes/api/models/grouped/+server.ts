import { getUserModelsGroupedByProvider } from "$lib/server/models-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ locals }) => {
  const { userId } = locals.auth();

  if (!userId) {
    return error(401, "Unauthorized");
  }

  try {
    const modelGroups = await getUserModelsGroupedByProvider(userId);
    return json(modelGroups);
  } catch (err) {
    console.error("Failed to fetch user model groups:", err);
    return error(500, "Internal Server Error");
  }
};
