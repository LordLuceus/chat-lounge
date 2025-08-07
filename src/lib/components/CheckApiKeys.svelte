<script lang="ts">
  import { SignedIn } from "svelte-clerk";
  import { hasAnyApiKey, hasAnyLLMKey } from "$lib/helpers/api-key-utils";

  const { data, children } = $props();
</script>

<SignedIn>
  {#if !hasAnyApiKey(data.keys)}
    <p>You don't have any API keys set.</p>
    <p>
      <a href="/settings">Set your API keys</a> or
      <a href="/getting-started">Read the getting started guide</a>.
    </p>
  {:else if !hasAnyLLMKey(data.keys)}
    <p>You need an API key from an LLM provider (e.g. OpenAI, Google, Anthropic) to continue.</p>
    <p>
      <a href="/settings">Set your API keys</a> or
      <a href="/getting-started">Read the getting started guide</a>.
    </p>
  {:else}
    {@render children?.()}
  {/if}
</SignedIn>
