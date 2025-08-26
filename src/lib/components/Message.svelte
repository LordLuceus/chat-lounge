<script lang="ts">
  import { page } from "$app/state";
  import EditMessage from "$lib/components/EditMessage.svelte";
  import MessageContent from "$lib/components/MessageContent.svelte";
  import Tts from "$lib/components/TTS.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import { formatMessageContent } from "$lib/helpers";
  import { conversationStore } from "$lib/stores";
  import type { DBMessage } from "$lib/types/db";
  import type { Message } from "@prisma/client";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { SignedIn } from "svelte-clerk";
  import { useClerkContext } from "svelte-clerk/client";
  import { toast } from "svelte-sonner";

  const ctx = useClerkContext();
  const user = $derived(ctx.user);

  interface Props {
    message: DBMessage;
    siblings?: Message[];
    onEdit: (id: string, content: string, regenerate: boolean) => void;
    isLoading: boolean | undefined;
    isLastMessage: boolean | undefined;
  }

  const { message, siblings = [], onEdit, isLoading, isLastMessage }: Props = $props();

  let rewindDialogOpen = $state(false);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(formatMessageContent(message.parts));
    toast.success("Message copied to clipboard");
  }

  const currentSiblingIndex = $derived(siblings.findIndex((sibling) => sibling.id === message.id));

  const client = useQueryClient();

  const updateConversationMutation = createMutation(() => ({
    mutationFn: async (value: string) =>
      (
        await fetch(`/api/conversations/${$conversationStore?.id}`, {
          method: "PUT",
          body: JSON.stringify({ currentNode: value })
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"] });
    }
  }));

  function setCurrentNode(id?: string) {
    if (!id) return;
    updateConversationMutation.mutate(id);
  }

  async function rewind(id: string) {
    const response = await fetch(`/api/conversations/${$conversationStore?.id}/rewind`, {
      method: "POST",
      body: JSON.stringify({ messageId: id })
    });

    if (!response.ok) {
      toast.error("Failed to rewind conversation.");
    }

    client.invalidateQueries({ queryKey: ["conversations"] });
    toast.success("Rewind successful.");
    rewindDialogOpen = false;
  }
</script>

<SignedIn>
  {#if message.role === "user" || message.role === "assistant"}
    <MessageContent
      {message}
      {user}
      modelName={message.role === "assistant" &&
      "model" in message &&
      message.model &&
      $conversationStore?.model &&
      message.model.id !== $conversationStore.model.id
        ? message.model.name
        : undefined}
    />

    <div class="message-actions">
      {#if message.role === "user" && !isLoading}
        <EditMessage
          id={message.id}
          content={formatMessageContent(message.parts)}
          onSubmit={onEdit}
        />
      {/if}
      {#if page.data.keys.elevenlabs && message.role === "assistant"}
        <Tts text={formatMessageContent(message.parts)} />
      {/if}
      <Button onclick={copyToClipboard}>Copy</Button>
      {#if siblings.length > 1}
        <div>
          <Button
            disabled={currentSiblingIndex < 1 || isLoading}
            onclick={() => setCurrentNode(siblings.at(currentSiblingIndex - 1)?.id)}
            >Previous message</Button
          >
          <span>{currentSiblingIndex + 1} / {siblings.length}</span>
          <Button
            disabled={currentSiblingIndex === siblings.length - 1 || isLoading}
            onclick={() => setCurrentNode(siblings.at(currentSiblingIndex + 1)?.id)}
            >Next message</Button
          >
        </div>
      {/if}
      {#if message.role === "assistant" && !isLastMessage}
        <Button onclick={() => (rewindDialogOpen = true)}>Rewind</Button>
      {/if}
    </div>
  {/if}
</SignedIn>

<AlertDialog.Root bind:open={rewindDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Rewind conversation?</AlertDialog.Title>
      <AlertDialog.Description
        >This will rewind the conversation to this message. Any messages after this point will be
        deleted.</AlertDialog.Description
      >
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => rewind(message.id)}>Rewind</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  .message-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .message-actions > div {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }
</style>
