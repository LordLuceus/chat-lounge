<script lang="ts">
  import type { Message } from "ai/svelte";
  import SvelteMarkdown from "svelte-markdown";

  export let message: Message;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(message.content);
  }
</script>

{#if message.role === "user" || message.role === "assistant"}
  <section>
    <div>
      <span>{message.role}: </span>
      {#if message.role === "user"}
        <span>{message.content}</span>
      {:else}
        <SvelteMarkdown source={message.content} />
      {/if}
      {#if message.role === "assistant"}
        <button on:click={copyToClipboard}>Copy</button>
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
</style>
