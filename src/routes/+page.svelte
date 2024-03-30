<script lang="ts">
  import Chat from "$lib/components/Chat.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>ChatMate</title>
  <meta
    name="description"
    content="ChatMate: Engage with cutting-edge AI models for instant text and voice conversations. Experience seamless, intelligent interactions tailored to your needs. Perfect for learning, entertainment, and efficient communication."
  />
</svelte:head>

<h1>ChatMate</h1>

<SignedIn let:user>
  {#if !data.keys}
    <p>You don't have any API keys set.</p>
    <a href="/settings">Set your API keys</a>
  {:else if !data.keys.mistral}
    <p>You need a Mistral API key to continue.</p>
    <a href="/settings">Set your Mistral API key</a>
  {:else}
    <Chat agents={data.agents} apiKeys={data.keys} voices={data.voices} userId={user?.id} />
  {/if}
</SignedIn>
