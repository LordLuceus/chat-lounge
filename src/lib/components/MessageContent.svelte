<script lang="ts">
  import { copyCodeBlocks } from "$lib/actions/copy-code";
  import ToolCallDisplay from "$lib/components/ToolCallDisplay.svelte";
  import { formatMessageContent } from "$lib/helpers";
  import { lineBreaksPlugin } from "$lib/line-breaks-plugin";
  import { BotMessageSquare } from "@lucide/svelte";
  import * as Avatar from "$lib/components/ui/avatar";
  import type { UIDataTypes, UIMessagePart, UITools } from "ai";
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
</style>
