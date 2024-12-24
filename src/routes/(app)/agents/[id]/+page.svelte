<script lang="ts">
  import { page } from "$app/stores";
  import Chat from "$lib/components/Chat.svelte";
  import CheckApiKeys from "$lib/components/CheckApiKeys.svelte";
  import type { Message } from "$lib/helpers";
  import { onMount } from "svelte";
  import { v4 as uuidv4 } from "uuid";
  import type { PageData } from "./$types";

  export let data: PageData;

  let initialMessages: Message[];
  $: if (data.agent.greeting) {
    initialMessages = [
      { role: "assistant", content: data.agent.greeting, id: uuidv4(), parentId: null }
    ];
  }

  onMount(async () => {
    if ($page.url.searchParams.get("shareId")) {
      const response = await fetch(
        `/api/conversations/shared/${$page.url.searchParams.get("shareId")}`
      );
      if (response.ok) {
        const data = await response.json();
        initialMessages = data.sharedMessages;
      }
    }
  });
</script>

<svelte:head>
  <title>{data.agent.name} | ChatLounge</title>
  <meta name="description" content={data.agent.description} />
</svelte:head>

<h1>
  {data.agent.name}
</h1>

<CheckApiKeys {data}>
  <Chat agent={data.agent} apiKeys={data.keys} models={data.models} {initialMessages} />
</CheckApiKeys>
