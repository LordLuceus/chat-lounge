import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getPresignedUrl } from "$lib/server/r2-storage";

export const POST: RequestHandler = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const { key, download } = await request.json();

    if (!key) {
      throw error(400, "Missing key");
    }

    // Verify the key belongs to the user (security check)
    if (!key.startsWith(`${userId}/`)) {
      throw error(403, "Forbidden");
    }

    // Generate presigned URL (expires in 1 hour). With `download`, the URL
    // makes the browser save the file under that name instead of showing it.
    const presignedUrl = await getPresignedUrl(
      key,
      3600,
      typeof download === "string" && download ? download : undefined
    );

    return json({ url: presignedUrl });
  } catch (err) {
    console.error("Presigned URL error:", err);
    throw error(500, err instanceof Error ? err.message : "Failed to generate URL");
  }
};
