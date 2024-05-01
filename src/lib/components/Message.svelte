<script lang="ts">
  import { page } from "$app/stores";
  import { copyCodeBlocks } from "$lib/actions/copy-code";
  import EditMessage from "$lib/components/EditMessage.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { lineBreaksPlugin } from "$lib/line-breaks-plugin";
  import { conversationStore } from "$lib/stores/conversation-store";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import type { Message } from "ai/svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import { BotMessageSquare } from "lucide-svelte";
  import Markdown from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";
  import { toast } from "svelte-sonner";
  import Tts from "./TTS.svelte";

  const plugins = [gfmPlugin(), lineBreaksPlugin];

  export let message: Message;
  export let voice: string | undefined;
  export let siblings: Message[] = [];
  export let onEdit: (id: string, content: string) => void;
  export let isLoading: boolean | undefined;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(message.content);
    toast.success(Toast, { componentProps: { text: "Message copied to clipboard" } });
  }

  $: currentSiblingIndex = siblings.findIndex((sibling) => sibling.id === message.id);

  const client = useQueryClient();

  const updateConversationMutation = createMutation({
    mutationFn: async (value: string) =>
      (
        await fetch(`/api/conversations/${$conversationStore?.id}`, {
          method: "PUT",
          body: JSON.stringify({ currentNode: value })
        })
      ).json(),
    onSuccess: () => client.invalidateQueries({ queryKey: ["conversations"] })
  });

  function setCurrentNode(id?: string) {
    if (!id) return;
    $updateConversationMutation.mutate(id);
  }
</script>

<SignedIn let:user>
  {#if message.role === "user" || message.role === "assistant"}
    <section aria-label="{message.role} message">
      <div class="{message.role}-message" use:copyCodeBlocks={{ content: message.content }}>
        {#if message.role === "user"}
          <Avatar.Root>
            <Avatar.Image src={user?.imageUrl} alt={user?.username} />
            <Avatar.Fallback>{user?.username}</Avatar.Fallback>
          </Avatar.Root>
        {:else}
          <BotMessageSquare />
        {/if}
        <Markdown md={message.content} {plugins} />
        {#if message.role === "user" && !isLoading}
          <EditMessage id={message.id} content={message.content} onSubmit={onEdit} />
        {/if}
        {#if $page.data.keys.eleven && message.role === "assistant"}
          <Tts text={message.content} {voice} />
        {/if}
        {#if message.role === "assistant"}
          <Button on:click={copyToClipboard}>Copy</Button>
        {/if}
        {#if siblings.length > 1}
          <div>
            <Button
              disabled={currentSiblingIndex < 1 || isLoading}
              on:click={() => setCurrentNode(siblings.at(currentSiblingIndex - 1)?.id)}
              >Previous message</Button
            >
            <span>{currentSiblingIndex + 1} / {siblings.length}</span>
            <Button
              disabled={currentSiblingIndex === siblings.length - 1 || isLoading}
              on:click={() => setCurrentNode(siblings.at(currentSiblingIndex + 1)?.id)}
              >Next message</Button
            >
          </div>
        {/if}
      </div>
    </section>
  {/if}
</SignedIn>

<style>
  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 0.6;
  }

  div {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-message {
    background-color: green;
    padding: 0.5rem;
    border-radius: 0.5rem;
  }

  .assistant-message {
    background-color: blue;
    padding: 0.5rem;
    border-radius: 0.5rem;
  }
</style>
