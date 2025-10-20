<script lang="ts">
  import { copyCodeBlocks } from "$lib/actions/copy-code";
  import ToolCallDisplay from "$lib/components/ToolCallDisplay.svelte";
  import { formatMessageContent } from "$lib/helpers";
  import { lineBreaksPlugin } from "$lib/line-breaks-plugin";
  import { BotMessageSquare } from "@lucide/svelte";
  import * as Avatar from "$lib/components/ui/avatar";
  import type { FileUIPart, UIDataTypes, UIMessagePart, UITools } from "ai";
  import Markdown from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";
  import { onMount } from "svelte";

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

  // Generate presigned URL for R2 key
  async function loadImageUrl(key: string, force = false) {
    if (imageUrls[key] && !force) return; // Already loaded (unless forcing refresh)

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

  // Handle image load error (likely expired presigned URL)
  async function handleImageError(key: string) {
    console.log("Image failed to load, regenerating presigned URL for:", key);
    await loadImageUrl(key, true); // Force regenerate
  }

  // Load presigned URLs for any parts with R2 keys
  onMount(() => {
    if (message.parts) {
      message.parts.forEach((part) => {
        if (hasKey(part)) {
          loadImageUrl(part.key);
        }
      });
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
        {:else if hasKey(part)}
          <!-- Part with R2 key - needs presigned URL -->
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
