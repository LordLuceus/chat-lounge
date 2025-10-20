import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { uploadFileToR2, getPresignedUrl } from "$lib/server/r2-storage";

export const POST: RequestHandler = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    throw error(401, "Unauthorized");
  }

  try {
    const { dataUrl, filename } = await request.json();

    if (!dataUrl || !filename) {
      throw error(400, "Missing dataUrl or filename");
    }

    const uploadedFile = await uploadFileToR2(dataUrl, userId, filename);

    // Generate 24-hour presigned URL for AI processing
    const presignedUrl = await getPresignedUrl(uploadedFile.key, 86400);

    return json({
      ...uploadedFile,
      url: presignedUrl
    });
  } catch (err) {
    console.error("Upload error:", err);
    throw error(500, err instanceof Error ? err.message : "Upload failed");
  }
};
