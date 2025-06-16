<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import SharedChatList from "$lib/components/SharedChatList.svelte";
  import { Button } from "$lib/components/ui/button";
  import { createQuery, useQueryClient } from "@tanstack/svelte-query";

  const client = useQueryClient();

  const conversationQuery = createQuery(() => {
    return {
      queryKey: ["sharedConversations", page.data?.conversation?.id],
      queryFn: async () =>
        (await fetch(`/api/conversations/shared/${page.data.conversation.id}`)).json(),
      initialData: page.data.conversation
    };
  });

  async function handleContinue() {
    const url = `/${conversationQuery.data.agentId ? "agents/" + conversationQuery.data.agentId : ""}?shareId=${conversationQuery.data.id}`;
    await goto(url);
  }
</script>

<svelte:head>
  <title>{conversationQuery.data.name} | ChatLounge</title>
  <meta name="description" content={conversationQuery.data.name} />
</svelte:head>

<h1>
  {conversationQuery.data.name}
</h1>

<SharedChatList messages={conversationQuery.data.sharedMessages} />

<Button onclick={handleContinue}>Continue conversation</Button>
