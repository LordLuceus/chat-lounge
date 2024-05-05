<script lang="ts">
  import Chat from "$lib/components/Chat.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.agent.name} | ChatLounge</title>
  <meta name="description" content={data.agent.description} />
</svelte:head>

<h1>
  {data.agent.name}
</h1>

<SignedIn let:user>
  <Chat agent={data.agent} apiKeys={data.keys} models={data.models} />
</SignedIn>
