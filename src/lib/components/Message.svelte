<script lang="ts">
  import { page } from "$app/stores";
  import { copyCodeBlocks } from "$lib/actions/copy-code";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { lineBreaksPlugin } from "$lib/line-breaks-plugin";
  import type { Message } from "ai/svelte";
  import Markdown from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";
  import { toast } from "svelte-sonner";
  import Tts from "./TTS.svelte";

  const plugins = [gfmPlugin(), lineBreaksPlugin];

  export let message: Message;
  export let voice: string | undefined;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(message.content);
    toast.success("Message copied to clipboard");
  }
</script>

{#if message.role === "user" || message.role === "assistant"}
  <section aria-label="{message.role} message">
    <div class="{message.role}-message" use:copyCodeBlocks={{ content: message.content }}>
      {#if message.role === "user"}
        <Avatar.Root>
          <Avatar.Image
            src={$page.data.session?.user?.image}
            alt={$page.data.session?.user?.name}
          />
          <Avatar.Fallback>{$page.data.session?.user?.name}</Avatar.Fallback>
        </Avatar.Root>
      {/if}
      <Markdown md={message.content} {plugins} />
      {#if $page.data.keys.eleven && message.role === "assistant"}
        <Tts text={message.content} {voice} on:playAudio on:downloadAudio />
      {/if}
      {#if message.role === "assistant"}
        <Button on:click={copyToClipboard}>Copy</Button>
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
