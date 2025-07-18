<script lang="ts">
  import { browser } from "$app/environment";
  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/state";
  import Message from "$lib/components/Message.svelte";
  import Recorder from "$lib/components/Recorder.svelte";
  import TtsSettings from "$lib/components/TtsSettings.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import type { Message as ExtendedMessage } from "$lib/helpers";
  import { ariaListOpen, getMessageSiblings } from "$lib/helpers";
  import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
  import {
    audioFilename,
    conversationStore,
    currentAudioUrl,
    downloadUrl,
    newConversation,
    selectedTtsModel,
    selectedVoice,
    ttsProps,
    voices
  } from "$lib/stores";
  import type { SelectItem } from "$lib/types/client";
  import { ModelID } from "$lib/types/elevenlabs";
  import { Chat } from "@ai-sdk/svelte";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { onDestroy, onMount, tick } from "svelte";
  import Select from "svelte-select";
  import { toast } from "svelte-sonner";
  import { v4 as uuidv4 } from "uuid";

  interface Props {
    agent?: { id: string; name: string } | undefined;
    apiKeys: { mistral: boolean; openai: boolean; eleven: boolean } | undefined;
    models: SelectItem[] | undefined;
    selectedModel?: SelectItem | undefined;
    initialMessages?: ExtendedMessage[] | undefined;
  }

  let {
    agent = undefined,
    apiKeys,
    models,
    selectedModel = $bindable(undefined),
    initialMessages = undefined
  }: Props = $props();

  let chatForm: HTMLFormElement | null = $state(null);
  let startSound: HTMLAudioElement;
  let finishSound: HTMLAudioElement;
  let voiceMessage: string | null = $state(null);

  let controller: AbortController;
  let signal: AbortSignal;

  const initialMessageCount = 20;
  let visibleMessageCount = $state(initialMessageCount);

  const client = useQueryClient();

  const createConversationMutation = createMutation<ConversationWithMessageMap>(() => ({
    mutationFn: async () =>
      (
        await fetch("/api/conversations", {
          method: "POST",
          body: JSON.stringify({
            agentId: agent?.id,
            modelId: selectedModel?.value,
            messages: chat.messages
          })
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"] });
      client.invalidateQueries({ queryKey: ["agents"] });
    }
  }));

  const chat = new Chat({
    onFinish: async (message) => {
      if (voiceMessage) {
        ttsProps.set({
          text: message.content,
          voice: $selectedVoice?.value,
          signal,
          modelId: $selectedTtsModel?.value || ModelID.ElevenTurboV2
        });
        setVoiceMessage("");
      } else {
        finishSound.play();
      }

      if (!$conversationStore) {
        createConversationMutation.mutate(undefined, {
          onSuccess: async (data) => {
            if (data.id) {
              newConversation.set(true);
              await goto(`${agent?.id ? "/agents/" + agent.id : ""}/conversations/${data.id}`, {
                keepFocus: true,
                noScroll: true
              });
              newConversation.set(false);
            }
          }
        });
      } else if ($conversationStore) client.invalidateQueries({ queryKey: ["conversations"] });
    },
    onResponse: () => {
      if (!voiceMessage) {
        startSound.play();
      }
    },
    body: {
      modelId: selectedModel?.value,
      agentId: agent?.id,
      conversationId: $conversationStore?.id
    },
    initialMessages
  });

  const visibleMessages = $derived(
    chat.messages.filter((message) => message.content).slice(-visibleMessageCount)
  );

  let followups: string[] = $state([]);
  const followupsMutation = createMutation<string[]>(() => ({
    mutationFn: async () =>
      (
        await fetch(`/api/conversations/${$conversationStore?.id}/followups`, {
          method: "POST"
        })
      ).json(),
    onSuccess: (data) => (followups = data),
    onError: () => toast.error("Failed to load follow-up suggestions.")
  }));

  function loadMoreMessages() {
    const newVisibleCount = visibleMessageCount + 20;
    visibleMessageCount = Math.min(newVisibleCount, chat.messages.length);
  }

  function loadAllMessages() {
    visibleMessageCount = chat.messages.length;
  }

  function handleMessageSubmit(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!chatForm) return;
      chatForm.requestSubmit();
    }
  }

  function handleFocusChatInput(event: KeyboardEvent) {
    if (event.key === "Escape" && event.shiftKey) {
      event.preventDefault();
      focusChatInput();
    }
  }

  function focusChatInput() {
    if ($newConversation) return;
    if (!chatForm) return;
    const chatInput = chatForm.querySelector("textarea") as HTMLTextAreaElement;
    if (!chatInput) return;
    setTimeout(() => {
      chatInput.focus();
    }, 0);
  }

  async function copyLastMessage() {
    if (!chat.messages) return;
    const lastMessage = chat.messages.at(-1);
    if (lastMessage?.role !== "assistant") return;
    await navigator.clipboard.writeText(lastMessage.content);
    toast.success("Last message copied to clipboard.");
  }

  function handleCopyLastMessage(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key === "C") {
      event.preventDefault();
      copyLastMessage();
    }
  }

  onMount(() => {
    focusChatInput();
    startSound = new Audio("/assets/begin.mp3");
    finishSound = new Audio("/assets/typing.wav");

    handleModelSelection();

    controller = new AbortController();
    signal = controller.signal;
  });

  onDestroy(() => {
    if (browser) {
      if (startSound) {
        startSound.pause();
        startSound.remove();
      }
      if (finishSound) {
        finishSound.pause();
        finishSound.remove();
      }

      if (!$newConversation) resetAudio();
      conversationStore.set(null);
    }
  });

  function handleModelSelection() {
    if (!selectedModel) {
      const storedModel = localStorage.getItem("selectedModel");
      if (storedModel) {
        const parsedModel: SelectItem = JSON.parse(storedModel);
        if (models?.find((model) => model.value === parsedModel.value)) {
          selectedModel = parsedModel;
        } else {
          selectedModel = models?.at(0);
        }
      } else {
        selectedModel = models?.at(0);
      }
    }
  }

  function setVoiceMessage(message: string) {
    voiceMessage = message;
  }

  function resetAudio() {
    ttsProps.set(null);
    currentAudioUrl.set(null);
    downloadUrl.set("");
    audioFilename.set("");
    controller?.abort();

    controller = new AbortController();
    signal = controller.signal;
  }

  $effect(() => {
    if (voiceMessage) {
      chat.append(
        { content: voiceMessage, role: "user" },
        {
          body: {
            modelId: selectedModel?.value,
            agentId: agent?.id,
            conversationId: $conversationStore?.id
          }
        }
      );
    }
  });

  function resetConversation() {
    chat.messages = initialMessages || [];
    resetAudio();
    handleModelSelection();

    if (page.url.pathname === "/") {
      conversationStore.set(null);
    }
  }

  afterNavigate(async () => {
    if (!$newConversation) resetConversation();
    followups = [];
    await tick();
    focusChatInput();
  });

  $effect(() => {
    if (initialMessages) {
      chat.messages = initialMessages;
    }
  });

  async function handleEdit(id: string, content: string, regenerate: boolean = true) {
    const messageIndex = chat.messages.findIndex((message) => message.id === id);

    if (messageIndex === -1) return;

    const updatedMessages = chat.messages.slice(0, messageIndex);
    updatedMessages.push({
      role: "user",
      content,
      id: regenerate ? uuidv4() : id,
      parts: [{ type: "text", text: content }]
    });

    chat.messages = updatedMessages;

    await tick();

    if (regenerate) {
      chat.reload({
        body: {
          modelId: selectedModel?.value,
          agentId: agent?.id,
          conversationId: $conversationStore?.id,
          messageId: id
        }
      });
    } else {
      const res = await fetch(`/api/conversations/${$conversationStore?.id}/messages/${id}`, {
        method: "PUT",
        body: JSON.stringify({ content })
      });

      if (!res.ok) {
        toast.error("Failed to update message.");
      }

      client.invalidateQueries({ queryKey: ["conversations"] });
    }
  }

  function importConversation() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.display = "none"; // Optionally hide the input element
    fileInput.accept = "application/json";

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = async (event) => {
        const json = event.target?.result as string;
        const data = JSON.parse(json);
        const modelId = selectedModel?.value;

        if (!modelId || !json) return;

        try {
          const response = await fetch(`/api/conversations/import`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ data, modelId })
          });

          if (response.ok) {
            const conversation = await response.json();
            client.invalidateQueries({ queryKey: ["conversations"] });
            await goto(
              `${conversation.agentId ? "/agents/" + conversation.agentId : ""}/conversations/${conversation.id}`
            );
          } else {
            toast.error("Failed to import conversation.");
          }
        } catch (error) {
          console.error("Error importing conversation:", error);
        }
      };

      reader.readAsText(file); // Start reading the file once it's selected
    });

    fileInput.click();
  }
</script>

<svelte:window
  onkeydown={(e) => {
    handleFocusChatInput(e);
    handleCopyLastMessage(e);
  }}
/>

<Select
  bind:value={selectedModel}
  items={models}
  placeholder="Select model..."
  on:change={() => localStorage.setItem("selectedModel", JSON.stringify(selectedModel))}
  {ariaListOpen}
  clearable={false}
/>

{#if apiKeys?.eleven && $voices}
  <TtsSettings />
{/if}

<section>
  <div class="chat-list">
    {#if visibleMessageCount < chat.messages.length}
      <div class="load-buttons mb-2 flex space-x-2">
        <Button
          class="load-more-button"
          onclick={loadMoreMessages}
          aria-label="Load previous messages"
        >
          Load More Messages
        </Button>
        <Button class="load-all-button" onclick={loadAllMessages} aria-label="Load all messages">
          Load All Messages
        </Button>
      </div>
    {/if}

    {#each visibleMessages as message (message.id)}
      <Message
        {message}
        siblings={getMessageSiblings($conversationStore?.messages, message.id)}
        onEdit={handleEdit}
        isLoading={chat.status === "streaming" || chat.status === "submitted"}
        isLastMessage={message.id === chat.messages.at(-1)?.id}
      />
    {/each}
  </div>
  <div class="chat-actions flex space-x-2">
    {#if chat.status === "streaming" || chat.status === "submitted"}
      <Button onclick={chat.stop}>Stop generating</Button>
    {/if}
    {#if chat.messages.at(-1)?.role === "assistant" && chat.status !== "streaming" && chat.status !== "submitted"}
      <Button
        onclick={() => {
          followups = [];
          chat.reload({
            body: {
              modelId: selectedModel?.value,
              agentId: agent?.id,
              conversationId: $conversationStore?.id,
              regenerate: true
            }
          });
        }}>Regenerate</Button
      >
      <Button
        class="ml-2"
        onclick={() => followupsMutation.mutate()}
        disabled={followupsMutation.isPending}
      >
        {#if followupsMutation.isPending}
          Loading suggestions...
        {:else}
          Suggest Follow-ups
        {/if}
      </Button>
    {/if}
    {#if chat.status === "error"}
      <p class="error">There was an error while getting a response from the AI.</p>
      <Button
        onclick={() =>
          chat.reload({
            body: {
              modelId: selectedModel?.value,
              agentId: agent?.id,
              conversationId: $conversationStore?.id
            }
          })}>Try again</Button
      >
    {/if}
  </div>

  {#if followups.length}
    <div class="sr-only" role="alert">
      <p>
        {followups.length} follow-up suggestion{followups.length > 1 ? "s" : ""} loaded.
      </p>
    </div>
    <div class="followup-suggestions mb-2 flex space-x-2">
      {#each followups as suggestion (suggestion)}
        <Button
          variant="outline"
          onclick={() => {
            chat.input = suggestion;
            focusChatInput();
          }}
        >
          {suggestion}
        </Button>
      {/each}
    </div>
  {/if}

  <form
    onsubmit={(e) => {
      followups = [];
      chat.handleSubmit(e, {
        body: {
          modelId: selectedModel?.value,
          agentId: agent?.id,
          conversationId: $conversationStore?.id
        },
        allowEmptySubmit: true
      });
    }}
    bind:this={chatForm}
  >
    <Textarea
      bind:value={chat.input}
      onkeydown={handleMessageSubmit}
      placeholder={agent ? `Message ${agent.name}:` : "Type your message:"}
      class="chat-input"
      rows={1}
      cols={200}
    />
  </form>
  {#if apiKeys?.openai && apiKeys.eleven && chat.status !== "streaming" && chat.status !== "submitted"}
    <Recorder {setVoiceMessage} />
  {/if}

  {#if !$conversationStore}
    <div class="import-conversation">
      <Button onclick={importConversation}>Import conversation</Button>
    </div>
  {/if}
</section>

<style>
  .chat-list {
    display: flex;
    flex-direction: column;
    max-height: 500px;
    overflow-y: auto;
    padding: 1rem;
  }
</style>
