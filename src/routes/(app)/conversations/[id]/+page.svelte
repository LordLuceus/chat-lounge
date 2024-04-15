<script lang="ts">
  import Chat from "$lib/components/Chat.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  $: messages = data.conversation.messages.map((m) => ({
    id: m.id,
    content: m.content,
    role: m.role as "user" | "assistant"
  }));

  $: selectedModel = data.models?.find((m) => m.value === data.conversation.modelId);
</script>

<svelte:head>
  <title>{data.conversation.name} | ChatLounge</title>
  <meta name="description" content={data.conversation.name} />
</svelte:head>

<h1>
  {data.conversation.name}
</h1>

<SignedIn let:user>
  <Chat
    apiKeys={data.keys}
    models={data.models}
    voices={data.voices}
    initialMessages={messages}
    conversationId={data.conversation.id}
    {selectedModel}
  />
</SignedIn>
