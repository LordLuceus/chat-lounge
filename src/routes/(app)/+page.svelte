<script lang="ts">
  import { page } from "$app/stores";
  import Chat from "$lib/components/Chat.svelte";
  import CheckApiKeys from "$lib/components/CheckApiKeys.svelte";
  import type { Message } from "$lib/helpers";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  let initialMessages: Message[] | undefined = undefined;

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
  <title>ChatLounge</title>
  <meta
    name="description"
    content="Welcome to ChatLounge – the ultimate platform for dynamic, AI-powered conversations. Whether you're looking to engage with various AI language models through text or voice, create your own custom chatbots, or dive into group discussions, ChatLounge offers an interactive, user-friendly space for all. Connect, collaborate, and explore the endless possibilities of AI communication in a vibrant community setting. Start your ChatLounge journey today and transform the way you interact with AI!"
  />
</svelte:head>

<h1>ChatLounge</h1>

<CheckApiKeys {data}>
  <Chat apiKeys={data.keys} models={data.models} {initialMessages} />
</CheckApiKeys>
