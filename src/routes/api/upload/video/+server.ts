import { createVideoUploadUrl, getPresignedUrl } from "$lib/server/r2-storage";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Returns a presigned PUT URL for uploading a video directly to R2, plus a
 * 24-hour GET URL for the AI provider to read it once the upload completes.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    error(401, "Unauthorized");
  }

  const { filename, mimeType, size } = await request.json();

  if (typeof filename !== "string" || typeof mimeType !== "string" || typeof size !== "number") {
    error(400, "Missing filename, mimeType, or size");
  }

  let result: { key: string; uploadUrl: string };
  try {
    result = await createVideoUploadUrl(userId, filename, mimeType, size);
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Invalid video");
  }

  const url = await getPresignedUrl(result.key, 86400);

  return json({ key: result.key, uploadUrl: result.uploadUrl, url });
};
