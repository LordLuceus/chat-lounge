<script lang="ts">
  import MessageContent from "$lib/components/MessageContent.svelte";
  import { Button } from "$lib/components/ui/button";
  import { formatMessageContent } from "$lib/helpers";
  import type { UIMessage } from "@ai-sdk/svelte";
  import { toast } from "svelte-sonner";

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
  <MessageContent {message} showUserAvatar={false} />

  {#if message.role === "assistant"}
    <div class="message-actions">
      <Button onclick={copyToClipboard}>Copy</Button>
    </div>
  {/if}
{/if}

<style>
  .message-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
</style>
