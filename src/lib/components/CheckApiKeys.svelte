<script lang="ts">
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";

  let { data, children } = $props();

  const children_render = $derived(children);
</script>

<SignedIn>
  {#snippet children({ user })}
    {#if !data.keys.eleven && !data.keys.mistral && !data.keys.openai && !data.keys.google && !data.keys.anthropic}
      <p>You don't have any API keys set.</p>
      <p>
        <a href="/settings">Set your API keys</a> or
        <a href="/getting-started">Read the getting started guide</a>.
      </p>
    {:else if !data.keys.mistral && !data.keys.openai && !data.keys.google && !data.keys.anthropic}
      <p>You need a Mistral, OpenAI, Anthropic, or Google API key to continue.</p>
      <p>
        <a href="/settings">Set your API keys</a> or
        <a href="/getting-started">Read the getting started guide</a>.
      </p>
    {:else}
      {@render children_render?.()}
    {/if}
  {/snippet}
</SignedIn>
