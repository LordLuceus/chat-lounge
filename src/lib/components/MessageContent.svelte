<script lang="ts">
  import { copyCodeBlocks } from "$lib/actions/copy-code";
  import ToolCallDisplay from "$lib/components/ToolCallDisplay.svelte";
  import * as Avatar from "$lib/components/ui/avatar";
  import { formatMessageContent, getGeneratedImage, isGeneratingImage } from "$lib/helpers";
  import { fetchYouTubeTitle, getYouTubeVideoId, isYouTubeUrl } from "$lib/helpers/youtube";
  import { lineBreaksPlugin } from "$lib/line-breaks-plugin";
  import { BotMessageSquare } from "@lucide/svelte";
  import type { FileUIPart, UIDataTypes, UIMessagePart, UITools } from "ai";
  import Markdown from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";

  const plugins = [gfmPlugin(), lineBreaksPlugin];

  interface Props {
    message: {
      role: string;
      parts?: Array<UIMessagePart<UIDataTypes, UITools>>;
    };
    user?: {
      imageUrl?: string;
      username?: string | null;
    } | null;
    showUserAvatar?: boolean;
    modelName?: string;
  }

  const { message, user = null, showUserAvatar = true, modelName }: Props = $props();

  // Store for presigned URLs (for messages loaded from DB with R2 keys)
  let imageUrls = $state<Record<string, string>>({});
  // Keys a URL has been requested for; plain Set so the effect below doesn't
  // re-run on its own writes.
  const requestedKeys = new Set<string>();

  // Type guard to check if part is FileUIPart
  function isFilePart(part: UIMessagePart<UIDataTypes, UITools>): part is FileUIPart {
    return part.type === "file";
  }

  // Type guard for parts with R2 keys (stored in DB)
  function hasKey(
    part: unknown
  ): part is { type: "file"; key: string; mediaType?: string; filename?: string } {
    const typed = part as { type?: string; key?: unknown };
    return typed.type === "file" && typeof typed.key === "string";
  }

  async function loadImageUrl(key: string, force = false) {
    if (requestedKeys.has(key) && !force) return; // Already loaded (unless forcing refresh)
    requestedKeys.add(key);

    try {
      const response = await fetch("/api/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });

      if (!response.ok) throw new Error("Failed to load image");

      const { url } = await response.json();
      imageUrls[key] = url;
    } catch (err) {
      console.error("Failed to load image:", err);
    }
  }

  // Video titles for YouTube embeds, keyed by video ID. No title when the
  // lookup fails; the player announces itself as a YouTube player regardless.
  let youtubeTitles = $state<Record<string, string>>({});

  async function loadYouTubeTitle(videoId: string) {
    const title = await fetchYouTubeTitle(videoId);
    if (title) youtubeTitles[videoId] = title;
  }

  async function handleImageError(key: string) {
    await loadImageUrl(key, true);
  }

  // Load presigned URLs for any parts with R2 keys: uploaded files loaded
  // from the DB, and images the generateImage tool produced, which can arrive
  // mid-stream, so this watches the parts rather than running once on mount.
  $effect(() => {
    for (const part of message.parts ?? []) {
      if (hasKey(part)) {
        loadImageUrl(part.key);
        continue;
      }
      const generated = getGeneratedImage(part);
      if (generated) loadImageUrl(generated.key);
    }
  });

  // Look up titles for YouTube embeds (cached, so re-runs are cheap).
  $effect(() => {
    for (const part of message.parts ?? []) {
      if (isFilePart(part) && isYouTubeUrl(part.url)) {
        const videoId = getYouTubeVideoId(part.url);
        if (videoId) loadYouTubeTitle(videoId);
      }
    }
  });
</script>

<section aria-label="{message.role} message">
  <div
    class="{message.role}-message"
    use:copyCodeBlocks={{ content: formatMessageContent(message.parts || []) }}
  >
    {#if message.role === "user" && showUserAvatar}
      <Avatar.Root>
        <Avatar.Image src={user?.imageUrl} alt={user?.username} />
        <Avatar.Fallback>{user?.username}</Avatar.Fallback>
      </Avatar.Root>
    {:else if message.role === "assistant"}
      <BotMessageSquare />
    {/if}

    {#if "parts" in message && message.parts && message.parts.length > 0}
      {#each message.parts as part, index (index)}
        {#if part.type === "text"}
          <Markdown md={part.text || ""} {plugins} />
        {:else if hasKey(part) && part.mediaType?.startsWith("video/")}
          <div class="message-video my-2">
            {#if imageUrls[part.key]}
              <video
                src={imageUrls[part.key]}
                controls
                preload="metadata"
                aria-label={part.filename || "Video attachment"}
                class="max-w-md rounded-lg"
                onerror={() => handleImageError(part.key)}
              >
                <track kind="captions" />
              </video>
            {:else}
              <p>Loading video: {part.filename || "attachment"}</p>
            {/if}
          </div>
        {:else if isFilePart(part) && isYouTubeUrl(part.url)}
          {@const videoId = getYouTubeVideoId(part.url)}
          <div class="message-video my-2">
            {#if videoId}
              <iframe
                src="https://www.youtube-nocookie.com/embed/{videoId}"
                title={youtubeTitles[videoId] ?? undefined}
                class="aspect-video w-full max-w-md rounded-lg"
                allow="encrypted-media; picture-in-picture; fullscreen"
                referrerpolicy="strict-origin-when-cross-origin"
                loading="lazy"
              ></iframe>
            {/if}
            <p>
              Video input: <a href={part.url} target="_blank" rel="noopener noreferrer"
                >{part.url}</a
              >
            </p>
          </div>
        {:else if isFilePart(part) && part.mediaType?.startsWith("video/")}
          <p class="message-video my-2">Video attachment: {part.filename || "video"}</p>
        {:else if hasKey(part)}
          <div class="message-image my-2">
            {#if imageUrls[part.key]}
              <button
                type="button"
                onclick={() => window.open(imageUrls[part.key], "_blank")}
                class="border-0 bg-transparent p-0"
              >
                <img
                  src={imageUrls[part.key]}
                  alt={part.filename || "Image attachment"}
                  class="max-w-md cursor-pointer rounded-lg shadow-md transition-opacity hover:opacity-90"
                  onerror={() => handleImageError(part.key)}
                />
              </button>
            {:else}
              <!-- Loading presigned URL -->
              <div class="h-32 w-32 animate-pulse rounded-lg bg-gray-200"></div>
            {/if}
          </div>
        {:else if isFilePart(part) && part.mediaType?.startsWith("image/")}
          <!-- FileUIPart with direct URL -->
          <div class="message-image my-2">
            <button
              type="button"
              onclick={() => window.open(part.url, "_blank")}
              class="border-0 bg-transparent p-0"
            >
              <img
                src={part.url}
                alt={part.filename || "Image attachment"}
                class="max-w-md cursor-pointer rounded-lg shadow-md transition-opacity hover:opacity-90"
              />
            </button>
          </div>
        {:else if part.type === "reasoning" && part.text}
          <aside class="reasoning-container">
            <details>
              <summary id="reasoning-summary">Reasoning</summary>
              <div class="reasoning-content" role="region" aria-labelledby="reasoning-summary">
                <pre>{part.text}</pre>
              </div>
            </details>
          </aside>
        {:else if part.type === "tool-generateImage"}
          {@const generated = getGeneratedImage(part)}
          <ToolCallDisplay {part} />
          {#if generated}
            <div class="message-image my-2">
              {#if imageUrls[generated.key]}
                <button
                  type="button"
                  onclick={() => window.open(imageUrls[generated.key], "_blank")}
                  class="border-0 bg-transparent p-0"
                >
                  <img
                    src={imageUrls[generated.key]}
                    alt={generated.filename || "Generated image"}
                    class="max-w-md cursor-pointer rounded-lg shadow-md transition-opacity hover:opacity-90"
                    onerror={() => handleImageError(generated.key)}
                  />
                </button>
              {:else}
                <!-- Loading presigned URL -->
                <div class="h-32 w-32 animate-pulse rounded-lg bg-gray-200"></div>
              {/if}
            </div>
          {:else if isGeneratingImage(part)}
            <p class="my-2 animate-pulse" role="status">Generating image…</p>
          {/if}
        {:else if part.type.startsWith("tool-") && part.type !== "tool-call" && part.type !== "tool-result"}
          <ToolCallDisplay {part} />
        {/if}
      {/each}
    {/if}

    {#if modelName}
      <div class="model-indicator">
        <small>{modelName}</small>
      </div>
    {/if}
  </div>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 0.6;
  }

  div {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-message {
    background-color: green;
    padding: 0.5rem;
    border-radius: 0.5rem;
  }

  .assistant-message {
    background-color: blue;
    padding: 0.5rem;
    border-radius: 0.5rem;
  }

  .model-indicator {
    margin-top: 0.25rem;
    opacity: 0.7;
    font-style: italic;
  }

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
</style>
