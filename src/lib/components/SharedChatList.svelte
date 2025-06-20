<script lang="ts">
  import SharedMessage from "$lib/components/SharedMessage.svelte";
  import type { Message } from "@ai-sdk/svelte";

  interface Props {
    messages: Message[];
  }

  const { messages }: Props = $props();
</script>

<div class="chat-list">
  {#each messages as message}
    <SharedMessage {message} />
  {/each}
</div>
