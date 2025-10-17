# Image Input Support Implementation Plan

## Overview
Implement multi-modal chat support with image inputs using Cloudflare R2 for file storage. Users will be able to upload images via file picker or paste from clipboard, with previews shown before sending.

## User Preferences
- **Storage**: Cloudflare R2 (external file storage with URLs)
- **Default support**: All models support images by default (`supportsImages=true`)
- **File types**: Images only (PNG, JPEG, GIF, WebP)
- **Size limit**: 5 MB per file

---

## Implementation Steps

### 1. Database Changes

**Add `supportsImages` field to Model table**

**File**: `prisma/schema.prisma`

```prisma
model Model {
  id            String         @id @db.VarChar(100)
  name          String         @db.VarChar(255)
  provider      AIProvider
  tokenLimit    Int
  reasoningType ReasoningType  @default(none)
  supportsTools Boolean        @default(true)
  supportsImages Boolean       @default(true)  // NEW FIELD
  createdAt     DateTime       @default(now()) @db.Timestamp(3)
  updatedAt     DateTime       @default(now()) @updatedAt @db.Timestamp(3)
  conversations Conversation[]
  messages      Message[]
  agents        Agent[]

  @@map("model")
}
```

**Actions**:
1. Add the field to schema
2. Run `pnpm migrate-create` to create migration
3. Run `pnpm migrate-dev` to apply migration
4. TypeScript types will auto-update via Prisma generation

---

### 2. Install Cloudflare R2 Dependencies

**Install AWS SDK v3 (R2 is S3-compatible)**

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

### 3. Environment Variables

**File**: `.env`

Add the following environment variables:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=chat-lounge-uploads
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**Setup Instructions**:
1. Create R2 bucket in Cloudflare dashboard
2. Generate API tokens with read/write permissions
3. Configure public access for the bucket (or use presigned URLs)
4. Add environment variables to `.env`

---

### 4. R2 Storage Service

**File**: `src/lib/server/r2-storage.ts` (NEW)

Create a service to handle R2 uploads:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

export interface UploadedFile {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a file to R2 from base64 data URL
 * @param dataUrl - Base64 data URL (e.g., "data:image/png;base64,...")
 * @param userId - User ID for organizing files
 * @param filename - Original filename
 * @returns Uploaded file metadata with public URL
 */
export async function uploadFileToR2(
  dataUrl: string,
  userId: string,
  filename: string
): Promise<UploadedFile> {
  // Parse data URL
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid data URL format');

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Validate file size (5MB limit)
  const sizeInMB = buffer.length / (1024 * 1024);
  if (sizeInMB > 5) {
    throw new Error(`File size ${sizeInMB.toFixed(2)}MB exceeds 5MB limit`);
  }

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`File type ${mimeType} not allowed`);
  }

  // Generate unique key
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
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

  // Return public URL
  const url = `${env.R2_PUBLIC_URL}/${key}`;

  return {
    url,
    key,
    size: buffer.length,
    mimeType
  };
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
```

---

### 5. Upload API Endpoint

**File**: `src/routes/api/upload/+server.ts` (NEW)

Create endpoint to handle file uploads:

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadFileToR2 } from '$lib/server/r2-storage';

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = locals.userId;
  if (!userId) {
    throw error(401, 'Unauthorized');
  }

  try {
    const { dataUrl, filename } = await request.json();

    if (!dataUrl || !filename) {
      throw error(400, 'Missing dataUrl or filename');
    }

    const uploadedFile = await uploadFileToR2(dataUrl, userId, filename);

    return json(uploadedFile);
  } catch (err) {
    console.error('Upload error:', err);
    throw error(500, err instanceof Error ? err.message : 'Upload failed');
  }
};
```

---

### 6. Chat Input UI Updates

**File**: `src/lib/components/Chat.svelte`

**State additions** (add after line 88):

```typescript
let attachedFiles = $state<Array<{
  id: string;
  type: string;
  url: string;
  preview: string;
  name: string;
  uploading?: boolean;
}>>([]);

let fileInputRef: HTMLInputElement | null = $state(null);
```

**File input element** (add in the form section, before the Textarea):

```svelte
<!-- Hidden file input -->
<input
  bind:this={fileInputRef}
  type="file"
  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
  multiple
  style="display: none;"
  onchange={handleFileSelect}
/>

<!-- Image preview section -->
{#if attachedFiles.length > 0}
  <div class="attached-files mb-2 flex flex-wrap gap-2">
    {#each attachedFiles as file (file.id)}
      <div class="relative">
        <img src={file.preview} alt={file.name} class="h-20 w-20 rounded object-cover" />
        {#if file.uploading}
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
            <span class="text-white text-xs">Uploading...</span>
          </div>
        {/if}
        <button
          type="button"
          onclick={() => removeFile(file.id)}
          class="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          aria-label="Remove {file.name}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}
```

**Attach button** (add before the Textarea):

```svelte
{#if selectedModel?.supportsImages !== false}
  <Button
    type="button"
    variant="outline"
    onclick={() => fileInputRef?.click()}
    disabled={chat.status === "streaming" || chat.status === "submitted"}
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd" />
    </svg>
    <span class="ml-2">Attach Image</span>
  </Button>
{/if}
```

**Helper functions** (add to script section):

```typescript
async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);

  for (const file of files) {
    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`${file.name} exceeds 5MB limit`);
      continue;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const id = uuidv4();
      attachedFiles.push({
        id,
        type: file.type,
        url: '', // Will be filled after upload
        preview: e.target?.result as string,
        name: file.name,
        uploading: true
      });

      // Upload to server
      uploadFile(id, e.target?.result as string, file.name);
    };
    reader.readAsDataURL(file);
  }

  // Reset input
  if (input) input.value = '';
}

async function uploadFile(fileId: string, dataUrl: string, filename: string) {
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, filename })
    });

    if (!response.ok) throw new Error('Upload failed');

    const { url } = await response.json();

    // Update file with actual URL
    attachedFiles = attachedFiles.map(f =>
      f.id === fileId ? { ...f, url, uploading: false } : f
    );
  } catch (err) {
    toast.error(`Failed to upload ${filename}`);
    removeFile(fileId);
  }
}

function removeFile(fileId: string) {
  attachedFiles = attachedFiles.filter(f => f.id !== fileId);
}

async function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) {
        // Reuse file select logic
        const reader = new FileReader();
        reader.onload = (e) => {
          const id = uuidv4();
          attachedFiles.push({
            id,
            type: file.type,
            url: '',
            preview: e.target?.result as string,
            name: `pasted-${Date.now()}.png`,
            uploading: true
          });
          uploadFile(id, e.target?.result as string, `pasted-${Date.now()}.png`);
        };
        reader.readAsDataURL(file);
      }
    }
  }
}
```

**Update form submission** (modify existing form onsubmit around line 525):

```typescript
onsubmit={async (e) => {
  e.preventDefault();

  // Check if any files are still uploading
  if (attachedFiles.some(f => f.uploading)) {
    toast.error('Please wait for uploads to complete');
    return;
  }

  followups = [];

  // Build message parts
  const parts: Array<{type: string, text?: string, url?: string, mediaType?: string}> = [];

  if (chatInput.trim()) {
    parts.push({ type: "text", text: chatInput });
  }

  for (const file of attachedFiles) {
    parts.push({
      type: "file",
      url: file.url,
      mediaType: file.type
    });
  }

  // Send message with parts
  chat.sendMessage(
    parts.length === 1 && parts[0].type === "text"
      ? { text: chatInput }  // Legacy format for text-only
      : { parts } as any,    // New format with files
    {
      body: {
        modelId: selectedModel?.value,
        agentId: agent?.id,
        conversationId: $conversationStore?.id,
        thinking
      }
    }
  );

  chatInput = "";
  attachedFiles = [];
}}
```

**Add paste handler to Textarea**:

```svelte
<Textarea
  bind:value={chatInput}
  onkeydown={handleMessageSubmit}
  onpaste={handlePaste}
  placeholder={agent ? `Message ${agent.name}:` : "Type your message:"}
  class="chat-input"
  rows={1}
  cols={200}
/>
```

---

### 7. API Chat Endpoint Updates

**File**: `src/routes/api/chat/+server.ts`

Update to handle file parts in messages:

```typescript
// Add after extracting request body
const { messages, modelId, agentId, conversationId, regenerate, editedMessageId, thinking } =
  await request.json();

// Process messages to ensure file parts are properly formatted
const processedMessages = messages.map((msg: any) => {
  if (!msg.parts) return msg;

  // Ensure file parts have proper structure
  const processedParts = msg.parts.map((part: any) => {
    if (part.type === 'file' && part.url) {
      return {
        type: 'image', // AI SDK expects 'image' type
        url: part.url,
        mimeType: part.mediaType || 'image/png'
      };
    }
    return part;
  });

  return { ...msg, parts: processedParts };
});

// Pass processedMessages to AIService instead of messages
```

---

### 8. AI Service Updates

**File**: `src/lib/server/ai-service.ts`

**Update token counting in `preProcess()`** (around the token calculation section):

```typescript
private preProcess(
  messages: UIMessage[],
  model: Model,
  agent: Agent | null,
  thinkingEnabled: boolean
): UIMessage[] {
  // ... existing code ...

  // Count tokens including images
  let tokenCount = 0;
  for (const msg of messages) {
    const textContent = formatMessageContent(msg.parts);
    tokenCount += estimateTokenCount(textContent);

    // Count image tokens (approximately 765 tokens per image for most models)
    const imageParts = msg.parts.filter(p => p.type === 'image' || p.type === 'file');
    tokenCount += imageParts.length * 765;
  }

  // ... rest of existing token limiting logic ...
}
```

---

### 9. Message Content Rendering

**File**: `src/lib/components/MessageContent.svelte`

**Add image rendering** (update the parts loop around line 45):

```svelte
{#each message.parts as part, index (index)}
  {#if part.type === "text"}
    <Markdown md={part.text || ""} {plugins} />
  {:else if part.type === "image" || part.type === "file"}
    <div class="message-image my-2">
      <img
        src={part.url}
        alt="Uploaded image"
        class="max-w-md rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
        onclick={() => window.open(part.url, '_blank')}
      />
    </div>
  {:else if part.type === "reasoning" && part.text}
    <aside class="reasoning-container">
      <!-- existing reasoning code -->
    </aside>
  {:else if part.type.startsWith("tool-") && part.type !== "tool-call" && part.type !== "tool-result"}
    <ToolCallDisplay {part} />
  {/if}
{/each}
```

**Add styles**:

```css
.message-image {
  display: block;
  margin: 0.5rem 0;
}

.message-image img {
  max-width: 28rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.message-image img:hover {
  opacity: 0.9;
}
```

---

### 10. Helper Updates

**File**: `src/lib/helpers/conversation-helpers.ts`

Update `formatMessageContent()` to handle images:

```typescript
export function formatMessageContent(parts: UIMessagePart<UIDataTypes, UITools>[]): string {
  return parts
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type === "image" || part.type === "file") return `[Image: ${part.url}]`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}
```

---

### 11. TypeScript Type Updates

**File**: `src/lib/types/client/index.ts` (or wherever ModelSelectItem is defined)

Update ModelSelectItem to include supportsImages:

```typescript
export interface ModelSelectItem {
  value: string;
  label: string;
  reasoningType?: ReasoningType;
  supportsImages?: boolean; // NEW
}
```

Update where models are mapped for the select dropdown to include this field.

---

### 12. Shared Conversations Support

No changes needed! The `SharedMessage` table already has a `parts` JSON field that will automatically store image URLs when conversations are shared.

---

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] R2 credentials configured and bucket accessible
- [ ] File selection via button works
- [ ] Paste image from clipboard works
- [ ] Image preview displays correctly
- [ ] Remove image button works
- [ ] Upload to R2 succeeds
- [ ] File size validation (5MB limit) works
- [ ] File type validation works
- [ ] Multiple images can be attached
- [ ] Images send with message correctly
- [ ] Images display in message history
- [ ] Images work with different AI providers
- [ ] Conversation export/import preserves images
- [ ] Shared conversations display images
- [ ] Message editing preserves images
- [ ] Message regeneration works with image context
- [ ] Models with supportsImages=false hide attach button
- [ ] Token counting accounts for images

---

## Files to Create/Modify

### New Files
1. `src/lib/server/r2-storage.ts` - R2 upload/delete utilities
2. `src/routes/api/upload/+server.ts` - Upload API endpoint

### Modified Files
1. `prisma/schema.prisma` - Add supportsImages field
2. `src/lib/components/Chat.svelte` - File input UI & paste handling
3. `src/lib/components/MessageContent.svelte` - Image rendering
4. `src/routes/api/chat/+server.ts` - Process image messages
5. `src/lib/server/ai-service.ts` - Token counting for images
6. `src/lib/helpers/conversation-helpers.ts` - Update formatMessageContent
7. `src/lib/types/client/index.ts` - Add supportsImages to type
8. `.env` - Add R2 configuration variables

### Dependencies to Install
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Key Implementation Notes

- **R2 Setup**: Requires Cloudflare R2 bucket with public access or presigned URLs
- **Message Format**: Uses `{type: 'file', url: string, mediaType: string}` in UI, converts to `{type: 'image', url: string, mimeType: string}` for AI SDK
- **File Organization**: Images stored in R2 as `{userId}/{timestamp}_{filename}`
- **Token Estimation**: ~765 tokens per image (varies by model)
- **Upload Flow**: Client → base64 → Upload API → R2 → Public URL → Message
- **ai-sdk Integration**: The `streamText()` function from ai-sdk automatically handles image parts when passed in messages
- **Paste Support**: Clipboard paste detection converts pasted images to files automatically

---

## Environment Setup Steps

1. **Create R2 Bucket**:
   - Go to Cloudflare Dashboard → R2
   - Create new bucket named `chat-lounge-uploads`
   - Enable public access or configure CORS

2. **Generate API Tokens**:
   - Go to R2 → Manage R2 API Tokens
   - Create token with read/write permissions
   - Copy Access Key ID and Secret Access Key

3. **Configure Environment**:
   ```env
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=chat-lounge-uploads
   R2_PUBLIC_URL=https://chat-lounge-uploads.your-subdomain.r2.dev
   ```

4. **Test Connection**:
   - After implementation, test upload endpoint
   - Verify files appear in R2 dashboard
   - Verify public URLs are accessible
