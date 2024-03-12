<script lang="ts">
  import type { Message } from "ai/svelte";
  import Markdown from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import Tts from "./TTS.svelte";

  const plugins = [gfmPlugin()];

  export let message: Message;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(message.content);
  }
</script>

{#if message.role === "user" || message.role === "assistant"}
  <section aria-label="{message.role} message">
    <div class="{message.role}-message">
      {#if message.role === "user"}
        <img src={$page.data.session?.user?.image} alt={$page.data.session?.user?.name} />
      {/if}
      <Markdown md={message.content} {plugins} />
      {#if message.role === "assistant"}
        {#if $page.data.keys.eleven}
          <Tts text={message.content} />
        {/if}
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
