<script lang="ts">
  import { page } from "$app/state";
  import Chat from "$lib/components/Chat.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { getConversationMessages, type Message } from "$lib/helpers";
  import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
  import { conversationStore } from "$lib/stores";
  import type { SelectItem } from "$lib/types/client";
  import { createQuery, useQueryClient } from "@tanstack/svelte-query";
  import { io, type Socket } from "socket.io-client";
  import { onDestroy, onMount } from "svelte";
  import { SignedIn } from "svelte-clerk";
  import { useClerkContext } from "svelte-clerk/client";
  import { toast } from "svelte-sonner";

  const ctx = useClerkContext();
  const user = $derived(ctx.user);

  const client = useQueryClient();

  const conversationQuery = createQuery<ConversationWithMessageMap>(() => ({
    queryKey: ["conversations", page.data?.conversation?.id],
    queryFn: async () => (await fetch(`/api/conversations/${page.data.conversation.id}`)).json(),
    initialData: page.data.conversation
  }));

  $effect(() => {
    conversationStore.set(conversationQuery.data);
  });

  let messages: Message[] = $state([]);

  $effect(() => {
    if ($conversationStore) messages = getConversationMessages($conversationStore);
  });

  let selectedModel = $derived(
    page.data.models?.find((m: SelectItem) => m.value === page.data.conversation.modelId)
  );

  function exportChatAsText(messages: Message[], userName?: string | null) {
    if (!messages || messages.length === 0) return;

    const assistantName = page.data.agent?.name || "Assistant";
    const userNameText = userName || "User";

    const chatText = messages
      .map(
        (message) =>
          `${message.role === "assistant" ? assistantName : userNameText}\n${message.content}`
      )
      .join("\n\n");

    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `${$conversationStore?.name}.txt`;
    downloadLink.click();

    URL.revokeObjectURL(url);
  }

  function exportChatAsJson(messages: Message[], userName?: string | null, userId?: string) {
    if (!messages || messages.length === 0) return;

    const assistantName = page.data.agent?.name || "Assistant";
    const userNameText = userName || "User";

    const chatJson = messages.map((message) => ({
      role: message.role,
      content: message.content,
      name: message.role === "assistant" ? assistantName : userNameText,
      id: message.id,
      parentId: message.parentId,
      senderId: message.role === "user" ? userId : page.data.agent?.id
    }));

    const blob = new Blob([JSON.stringify(chatJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `${$conversationStore?.name}.json`;
    downloadLink.click();

    URL.revokeObjectURL(url);
  }

  let progress: number = $state(0);
  let socket: Socket;

  onMount(() => {
    if (!$conversationStore?.isImporting) return;
    socket = io();
    socket.on("progress", (data) => {
      progress = data.progress;
    });
    socket.on("completed", (data) => {
      client.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(Toast, { componentProps: { text: "Chat imported successfully." } });
      socket.disconnect();
    });
    socket.on("failed", (data) => {
      toast.error(Toast, {
        componentProps: { text: `Failed to import chat. ${data.error}` }
      });
    });
    socket.emit("join-import-room", $conversationStore.id);
  });

  onDestroy(() => {
    if (socket) socket.disconnect();
  });
</script>

<svelte:head>
  <title>{$conversationStore?.name} | ChatLounge</title>
  <meta name="description" content={$conversationStore?.name} />
</svelte:head>

<h1>
  {$conversationStore?.name}
</h1>

<SignedIn>
  {#if !$conversationStore?.isImporting}
    {#key page.data.conversation.id}
      <Chat
        apiKeys={page.data.keys}
        models={page.data.models}
        initialMessages={messages}
        {selectedModel}
        agent={page.data?.agent}
      />
    {/key}
    <div class="export-chat">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>Export Chat</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onclick={() => exportChatAsText(messages, user?.username)}
            >Export to text file</DropdownMenu.Item
          >
          <DropdownMenu.Item onclick={() => exportChatAsJson(messages, user?.username, user?.id)}
            >Export to JSON</DropdownMenu.Item
          >
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  {:else}
    <div class="import-progress">
      <p>Importing chat...</p>
      <div class="progress-bar">
        <progress max="100" value={progress}></progress>
      </div>
    </div>
  {/if}
</SignedIn>
