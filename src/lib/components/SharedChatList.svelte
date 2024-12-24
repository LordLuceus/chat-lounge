<script lang="ts">
  import SharedMessage from "$lib/components/SharedMessage.svelte";
  import type { Message } from "@ai-sdk/svelte";

  export let messages: Message[];
</script>

<div class="chat-list">
  {#each messages as message}
    <SharedMessage {message} />
  {/each}
</div>
