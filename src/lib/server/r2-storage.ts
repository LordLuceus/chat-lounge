import { env } from "$env/dynamic/private";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!
  }
});

export interface UploadedFile {
  key: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a file to R2 from base64 data URL
 * @param dataUrl - Base64 data URL (e.g., "data:image/png;base64,...")
 * @param userId - User ID for organizing files
 * @param filename - Original filename
 * @returns Uploaded file metadata (key to generate presigned URLs later)
 */
export async function uploadFileToR2(
  dataUrl: string,
  userId: string,
  filename: string
): Promise<UploadedFile> {
  // Parse data URL
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid data URL format");

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  return uploadImageBuffer(buffer, mimeType, userId, filename, MAX_UPLOAD_BYTES);
}

/**
 * Upload an image the server generated (via the `generateImage` tool) to R2.
 * Same key layout as user uploads, so ownership checks and cleanup treat
 * them alike. The limit is higher than for uploads because image models can
 * return large PNGs.
 */
export async function uploadGeneratedImageToR2(
  buffer: Buffer,
  mimeType: string,
  userId: string,
  filename: string
): Promise<UploadedFile> {
  return uploadImageBuffer(buffer, mimeType, userId, filename, MAX_GENERATED_IMAGE_BYTES);
}

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_GENERATED_IMAGE_BYTES = 25 * 1024 * 1024;

async function uploadImageBuffer(
  buffer: Buffer,
  mimeType: string,
  userId: string,
  filename: string,
  maxBytes: number
): Promise<UploadedFile> {
  if (buffer.length > maxBytes) {
    const sizeInMB = buffer.length / (1024 * 1024);
    throw new Error(
      `File size ${sizeInMB.toFixed(2)}MB exceeds ${maxBytes / (1024 * 1024)}MB limit`
    );
  }

  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error(`File type ${mimeType} not allowed`);
  }

  // Generate unique key
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${userId}/${timestamp}_${sanitizedFilename}`;

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ContentLength: buffer.length
  });

  await r2Client.send(command);

  // Return metadata (without URL - will generate presigned URLs on demand)
  return {
    key,
    size: buffer.length,
    mimeType
  };
}

/**
 * Generate a presigned URL for accessing a file in R2
 * @param key - The R2 object key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL that expires after specified time
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key
  });

  const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return presignedUrl;
}

/** Video types Gemini accepts, per its file input docs. */
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "video/x-flv",
  "video/3gpp",
  "video/avi",
  "video/wmv"
];

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/**
 * Create a presigned PUT URL so the browser can upload a video straight to R2,
 * bypassing the app server's body size limit. Content-Type and Content-Length
 * are part of the signature, so the browser must send exactly the declared
 * type and size, which enforces the limit on R2's side.
 */
export async function createVideoUploadUrl(
  userId: string,
  filename: string,
  mimeType: string,
  size: number
): Promise<{ key: string; uploadUrl: string }> {
  if (!ALLOWED_VIDEO_TYPES.includes(mimeType)) {
    throw new Error(`File type ${mimeType} not allowed`);
  }

  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_VIDEO_BYTES) {
    throw new Error(`Video must be between 1 byte and ${MAX_VIDEO_BYTES / (1024 * 1024)}MB`);
  }

  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${userId}/${Date.now()}_${sanitizedFilename}`;

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
    ContentLength: size
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: 600,
    signableHeaders: new Set(["content-type", "content-length"])
  });

  return { key, uploadUrl };
}

/**
 * Delete a file from R2
 * @param key - The R2 object key
 */
export async function deleteFileFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key
  });

  await r2Client.send(command);
}

/**
 * Delete multiple files from R2 in batch
 * @param keys - Array of R2 object keys to delete
 * @returns Number of files deleted
 */
export async function bulkDeleteFilesFromR2(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  // S3/R2 DeleteObjects can handle up to 1000 objects at once
  // Split into chunks if needed
  const chunkSize = 1000;
  let totalDeleted = 0;

  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);

    const command = new DeleteObjectsCommand({
      Bucket: env.R2_BUCKET_NAME,
      Delete: {
        Objects: chunk.map((key) => ({ Key: key })),
        Quiet: true // Don't return info about successful deletions
      }
    });

    const result = await r2Client.send(command);

    // Count successful deletions
    const deleted = chunk.length - (result.Errors?.length || 0);
    totalDeleted += deleted;

    // Log errors if any
    if (result.Errors && result.Errors.length > 0) {
      console.error(`Failed to delete ${result.Errors.length} files from R2:`, result.Errors);
    }
  }

  return totalDeleted;
}
