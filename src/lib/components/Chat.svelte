<script lang="ts">
  import { browser } from "$app/environment";
  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Message from "$lib/components/Message.svelte";
  import Recorder from "$lib/components/Recorder.svelte";
  import Toast from "$lib/components/Toast.svelte";
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
  import { useChat } from "@ai-sdk/svelte";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { onDestroy, onMount, tick } from "svelte";
  import Select from "svelte-select";
  import { toast } from "svelte-sonner";
  import { v4 as uuidv4 } from "uuid";

  export let agent: { id: string; name: string } | undefined = undefined;
  export let apiKeys: { mistral: boolean; openai: boolean; eleven: boolean } | undefined;
  export let models: SelectItem[] | undefined;
  export let selectedModel: SelectItem | undefined = undefined;
  export let initialMessages: ExtendedMessage[] | undefined = undefined;

  let chatForm: HTMLFormElement;
  let finishSound: HTMLAudioElement;
  let voiceMessage: string;

  let controller: AbortController;
  let signal: AbortSignal;

  const initialMessageCount = 20;
  let visibleMessageCount = initialMessageCount;

  const client = useQueryClient();

  const createConversationMutation = createMutation<ConversationWithMessageMap>({
    mutationFn: async () =>
      (
        await fetch("/api/conversations", {
          method: "POST",
          body: JSON.stringify({
            agentId: agent?.id,
            modelId: selectedModel?.value,
            messages: $messages
          })
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"] });
      client.invalidateQueries({ queryKey: ["agents"] });
    }
  });

  const { append, error, handleSubmit, input, isLoading, messages, reload, setMessages, stop } =
    useChat({
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
          $createConversationMutation.mutate(undefined, {
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
      body: {
        modelId: selectedModel?.value,
        agentId: agent?.id,
        conversationId: $conversationStore?.id
      },
      initialMessages
    });

  $: visibleMessages = $messages.filter((message) => message.content).slice(-visibleMessageCount);

  function loadMoreMessages() {
    const newVisibleCount = visibleMessageCount + 20; // Load 20 more messages each time
    visibleMessageCount = Math.min(newVisibleCount, $messages.length); // Prevent exceeding total
  }

  function handleMessageSubmit(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
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
    const chatInput = document.querySelector(".chat-input") as HTMLTextAreaElement;
    chatInput.focus();
  }

  async function copyLastMessage() {
    if (!$messages) return;
    const lastMessage = $messages.at(-1);
    if (lastMessage?.role !== "assistant") return;
    await navigator.clipboard.writeText(lastMessage.content);
    toast.success(Toast, { componentProps: { text: "Last message copied to clipboard." } });
  }

  function handleCopyLastMessage(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key === "C") {
      event.preventDefault();
      copyLastMessage();
    }
  }

  onMount(() => {
    focusChatInput();
    finishSound = new Audio("/assets/typing.wav");

    handleModelSelection();

    controller = new AbortController();
    signal = controller.signal;
  });

  onDestroy(() => {
    if (browser) {
      finishSound.pause();
      finishSound.remove();

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

  $: {
    if (voiceMessage) {
      append(
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
  }

  function resetConversation() {
    setMessages(initialMessages || []);
    resetAudio();
    handleModelSelection();

    if ($page.url.pathname === "/") {
      conversationStore.set(null);
    }
  }

  afterNavigate(async () => {
    if (!$newConversation) resetConversation();
    await tick();
    focusChatInput();
  });

  $: if (initialMessages) {
    setMessages(initialMessages);
  }

  async function handleEdit(id: string, content: string, regenerate: boolean = true) {
    const messageIndex = $messages.findIndex((message) => message.id === id);

    if (messageIndex === -1) return;

    const updatedMessages = $messages.slice(0, messageIndex);
    updatedMessages.push({
      role: "user",
      content,
      id: regenerate ? uuidv4() : id,
      parts: [{ type: "text", text: content }]
    });

    setMessages(updatedMessages);

    await tick();

    if (regenerate) {
      reload({
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
        toast.error(Toast, {
          componentProps: { text: "Failed to update message." }
        });
      }

      client.invalidateQueries({ queryKey: ["conversations"] });
    }
  }

  function importConversation() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.display = "none"; // Optionally hide the input element
    fileInput.accept = "application/json";

    // Attach a change event listener to handle file selection
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
            toast.error(Toast, {
              componentProps: { text: "Failed to import conversation." }
            });
          }
        } catch (error) {
          console.error("Error importing conversation:", error);
        }
      };

      reader.readAsText(file); // Start reading the file once it's selected
    });

    // Trigger the file selection dialog
    fileInput.click();
  }
</script>

<svelte:window on:keydown={handleCopyLastMessage} on:keydown={handleFocusChatInput} />

<Select
  bind:value={selectedModel}
  items={models}
  placeholder="Select model..."
  on:change={(e) => localStorage.setItem("selectedModel", JSON.stringify(selectedModel))}
  {ariaListOpen}
  clearable={false}
/>

{#if apiKeys?.eleven && $voices}
  <TtsSettings />
{/if}

<section>
  <div class="chat-list">
    {#if visibleMessageCount < $messages.length}
      <Button
        class="load-more-button"
        on:click={loadMoreMessages}
        aria-label="Load previous messages"
      >
        Load More Messages
      </Button>
    {/if}

    {#each visibleMessages as message (message.id)}
      <Message
        {message}
        siblings={getMessageSiblings($conversationStore?.messages, message.id)}
        onEdit={handleEdit}
        isLoading={$isLoading}
        isLastMessage={message.id === $messages.at(-1)?.id}
      />
    {/each}
  </div>
  {#if $isLoading}
    <Button on:click={stop}>Stop generating</Button>
  {/if}
  {#if $messages.at(-1)?.role === "assistant" && !$isLoading}
    <Button
      on:click={() =>
        reload({
          body: {
            modelId: selectedModel?.value,
            agentId: agent?.id,
            conversationId: $conversationStore?.id,
            regenerate: true
          }
        })}>Regenerate</Button
    >
  {/if}
  {#if $error}
    <p class="error">There was an error while getting a response from the AI.</p>
    <Button
      on:click={() =>
        reload({
          body: {
            modelId: selectedModel?.value,
            agentId: agent?.id,
            conversationId: $conversationStore?.id
          }
        })}>Try again</Button
    >
  {/if}

  <form
    on:submit={(e) =>
      handleSubmit(e, {
        body: {
          modelId: selectedModel?.value,
          agentId: agent?.id,
          conversationId: $conversationStore?.id
        },
        allowEmptySubmit: true
      })}
    bind:this={chatForm}
  >
    <Textarea
      bind:value={$input}
      on:keydown={handleMessageSubmit}
      placeholder={agent ? `Message ${agent.name}:` : "Type your message:"}
      class="chat-input"
      rows={1}
      cols={200}
    />
  </form>
  {#if apiKeys?.openai && apiKeys.eleven && !$isLoading}
    <Recorder {setVoiceMessage} />
  {/if}

  {#if !$conversationStore}
    <div class="import-conversation">
      <Button on:click={importConversation}>Import conversation (BETA)</Button>
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
