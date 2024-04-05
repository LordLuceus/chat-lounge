<script lang="ts">
  import Chat from "$lib/components/Chat.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import type { PageData } from "./$types";
  import AgentDropdown from "./AgentDropdown.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.agent.name} | ChatLounge</title>
  <meta name="description" content={data.agent.description} />
</svelte:head>

<h1>
  <AgentDropdown />
</h1>

<SignedIn let:user>
  <Chat agentId={data.agent.id} apiKeys={data.keys} models={data.models} voices={data.voices} />
</SignedIn>
