<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<h1>Conversations</h1>

{#each data.conversations as conversation}
  <p>{conversation.conversation.name}</p>
{/each}
