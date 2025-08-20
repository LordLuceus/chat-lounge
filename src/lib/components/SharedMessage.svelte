<script lang="ts">
  import { copyCodeBlocks } from "$lib/actions/copy-code";
  import { Button } from "$lib/components/ui/button";
  import { formatMessageContent } from "$lib/helpers";
  import { lineBreaksPlugin } from "$lib/line-breaks-plugin";
  import type { UIMessage } from "@ai-sdk/svelte";
  import { BotMessageSquare } from "@lucide/svelte";
  import Markdown from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";
  import { toast } from "svelte-sonner";

  const plugins = [gfmPlugin(), lineBreaksPlugin];

  interface Props {
    message: UIMessage;
  }

  const { message }: Props = $props();

  async function copyToClipboard() {
    await navigator.clipboard.writeText(formatMessageContent(message.parts));
    toast.success("Message copied to clipboard");
  }
</script>

{#if message.role === "user" || message.role === "assistant"}
  <section aria-label="{message.role} message">
    <div
      class="{message.role}-message"
      use:copyCodeBlocks={{ content: formatMessageContent(message.parts) }}
    >
      {#if message.role === "assistant"}
        <BotMessageSquare />
      {/if}
      {#if "parts" in message && message.parts && message.parts.length > 0}
        {#each message.parts as part, index (index)}
          {#if part.type === "text"}
            <Markdown md={part.text || ""} {plugins} />
          {:else if part.type === "reasoning"}
            <details class="reasoning-container">
              <summary>Reasoning</summary>
              <div class="reasoning-content">
                <Markdown md={part.text || ""} {plugins} />
              </div>
            </details>
          {/if}
        {/each}
      {/if}

      {#if message.role === "assistant"}
        <Button onclick={copyToClipboard}>Copy</Button>
      {/if}
    </div>
  </section>
{/if}

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
</style>
