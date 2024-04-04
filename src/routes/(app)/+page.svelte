<script lang="ts">
  import Chat from "$lib/components/Chat.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>ChatLounge</title>
  <meta
    name="description"
    content="Welcome to ChatLounge – the ultimate platform for dynamic, AI-powered conversations. Whether you're looking to engage with various AI language models through text or voice, create your own custom chatbots, or dive into group discussions, ChatLounge offers an interactive, user-friendly space for all. Connect, collaborate, and explore the endless possibilities of AI communication in a vibrant community setting. Start your ChatLounge journey today and transform the way you interact with AI!"
  />
</svelte:head>

<h1>ChatLounge</h1>

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
    <Chat apiKeys={data.keys} models={data.models} voices={data.voices} userId={user?.id} />
  {/if}
</SignedIn>
