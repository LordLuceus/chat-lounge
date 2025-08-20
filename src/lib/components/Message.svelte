<script lang="ts">
  import { page } from "$app/state";
  import { copyCodeBlocks } from "$lib/actions/copy-code";
  import EditMessage from "$lib/components/EditMessage.svelte";
  import Tts from "$lib/components/TTS.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { formatMessageContent } from "$lib/helpers";
  import { lineBreaksPlugin } from "$lib/line-breaks-plugin";
  import { conversationStore } from "$lib/stores";
  import type { DBMessage } from "$lib/types/db";
  import { BotMessageSquare } from "@lucide/svelte";
  import type { Message } from "@prisma/client";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { SignedIn } from "svelte-clerk";
  import { useClerkContext } from "svelte-clerk/client";
  import Markdown from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";
  import { toast } from "svelte-sonner";

  const ctx = useClerkContext();
  const user = $derived(ctx.user);

  const plugins = [gfmPlugin(), lineBreaksPlugin];

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
    <section aria-label="{message.role} message">
      <div
        class="{message.role}-message"
        use:copyCodeBlocks={{ content: formatMessageContent(message.parts) }}
      >
        {#if message.role === "user"}
          <Avatar.Root>
            <Avatar.Image src={user?.imageUrl} alt={user?.username} />
            <Avatar.Fallback>{user?.username}</Avatar.Fallback>
          </Avatar.Root>
        {:else}
          <BotMessageSquare />
        {/if}

        {#if "parts" in message && message.parts && message.parts.length > 0}
          {#each message.parts as part, index (index)}
            {#if part.type === "text"}
              <Markdown md={part.text || ""} {plugins} />
            {:else if part.type === "reasoning" && part.text}
              <aside class="reasoning-container" aria-labelledby="reasoning-summary">
                <details>
                  <summary id="reasoning-summary">Reasoning</summary>
                  <div class="reasoning-content">
                    <pre>{part.text}</pre>
                  </div>
                </details>
              </aside>
            {/if}
          {/each}
        {/if}

        {#if message.role === "assistant" && "model" in message && message.model && $conversationStore?.model && message.model.id !== $conversationStore.model.id}
          <div class="model-indicator">
            <small>{message.model.name}</small>
          </div>
        {/if}

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
    </section>
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

  .model-indicator {
    margin-top: 0.25rem;
    opacity: 0.7;
    font-style: italic;
  }
</style>
