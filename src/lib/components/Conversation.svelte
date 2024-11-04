<script lang="ts">
  import { page } from "$app/stores";
  import Chat from "$lib/components/Chat.svelte";
  import { getConversationMessages, type Message } from "$lib/helpers";
  import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
  import { conversationStore } from "$lib/stores";
  import type { SelectItem } from "$lib/types/client";
  import { createQuery } from "@tanstack/svelte-query";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import { derived } from "svelte/store";

  const conversationQuery = createQuery<ConversationWithMessageMap>(
    derived(page, ($page) => ({
      queryKey: ["conversations", $page.data?.conversation?.id],
      queryFn: async () => (await fetch(`/api/conversations/${$page.data.conversation.id}`)).json(),
      initialData: $page.data.conversation
    }))
  );

  $: conversationStore.set($conversationQuery.data);

  let messages: Message[] = [];
  $: if ($conversationStore) messages = getConversationMessages($conversationStore);

  $: selectedModel = $page.data.models?.find(
    (m: SelectItem) => m.value === $page.data.conversation.modelId
  );

  function exportChat(messages: Message[], userName?: string | null) {
    if (!messages || messages.length === 0) return;

    // Format the chat messages as plain text
    const assistantName = $page.data.agent?.name || "Assistant";
    const userNameText = userName || "User";

    const chatText = messages
      .map(
        (message) =>
          `${message.role === "assistant" ? assistantName : userNameText}\n${message.content}`
      )
      .join("\n\n");

    // Create a blob and download link
    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `${$conversationStore?.name}.txt`;
    downloadLink.click();

    // Clean up URL object after download
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>{$conversationStore?.name} | ChatLounge</title>
  <meta name="description" content={$conversationStore?.name} />
</svelte:head>

<h1>
  {$conversationStore?.name}
</h1>

<SignedIn let:user>
  <Chat
    apiKeys={$page.data.keys}
    models={$page.data.models}
    initialMessages={messages}
    {selectedModel}
    agent={$page.data?.agent}
  />
  <div class="export-chat">
    <button on:click={() => exportChat(messages, user?.username)}>Export chat</button>
  </div>
</SignedIn>
