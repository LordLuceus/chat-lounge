<script lang="ts">
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";

  export let data;
</script>

<SignedIn let:user>
  {#if !data.keys.eleven && !data.keys.mistral && !data.keys.openai}
    <p>You don't have any API keys set.</p>
    <p>
      <a href="/settings">Set your API keys</a> or
      <a href="/getting-started">Read the getting started guide</a>.
    </p>
  {:else if !data.keys.mistral && !data.keys.openai}
    <p>You need a Mistral or OpenAI API key to continue.</p>
    <p>
      <a href="/settings">Set your API keys</a> or
      <a href="/getting-started">Read the getting started guide</a>.
    </p>
  {:else}
    <slot />
  {/if}
</SignedIn>
