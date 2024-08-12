<script lang="ts">
  import { browser } from "$app/environment";
  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/stores";
  import AdvancedTtsSettings from "$lib/components/AdvancedTtsSettings.svelte";
  import Message from "$lib/components/Message.svelte";
  import Recorder from "$lib/components/Recorder.svelte";
  import Toast from "$lib/components/Toast.svelte";
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
    ttsProps,
    voices
  } from "$lib/stores";
  import type { SelectItem } from "$lib/types/client";
  import { ModelID } from "$lib/types/elevenlabs";
  import { useChat } from "@ai-sdk/svelte";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { onDestroy, onMount } from "svelte";
  import Select from "svelte-select";
  import { toast } from "svelte-sonner";

  export let agent: { id: string; name: string } | undefined = undefined;
  export let apiKeys: { mistral: boolean; openai: boolean; eleven: boolean } | undefined;
  export let models: SelectItem[] | undefined;
  export let selectedModel: SelectItem | undefined = undefined;
  export let initialMessages: ExtendedMessage[] | undefined = undefined;

  let chatForm: HTMLFormElement;
  let finishSound: HTMLAudioElement;
  let voiceMessage: string;

  let selectedVoice: SelectItem | undefined = undefined;

  $: voiceItems = $voices?.map((voice) => ({
    label: `${voice.name} (${voice.category})`,
    value: voice.voice_id
  }));

  let controller: AbortController;
  let signal: AbortSignal;

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
    onSuccess: () => client.invalidateQueries({ queryKey: ["conversations"] })
  });

  const { append, error, handleSubmit, input, isLoading, messages, reload, setMessages, stop } =
    useChat({
      onFinish: async (message) => {
        if (voiceMessage) {
          ttsProps.set({
            text: message.content,
            voice: selectedVoice?.value,
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
    handleVoiceSelection();

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

  function handleVoiceSelection() {
    if (!selectedVoice) {
      const storedVoice = localStorage.getItem("selectedVoice");
      if (storedVoice) {
        const parsedVoice: SelectItem = JSON.parse(storedVoice);
        if ($voices?.find((voice) => voice.voice_id === parsedVoice.value)) {
          selectedVoice = parsedVoice;
        } else {
          selectedVoice = voiceItems?.at(0);
        }
      } else {
        selectedVoice = voiceItems?.at(0);
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
          options: {
            body: {
              modelId: selectedModel?.value,
              agentId: agent?.id,
              conversationId: $conversationStore?.id
            }
          }
        }
      );
    }
  }

  $: if ($voices) {
    handleVoiceSelection();
  }

  function resetConversation() {
    setMessages(initialMessages || []);
    resetAudio();
    handleModelSelection();

    if ($page.url.pathname === "/") {
      conversationStore.set(null);
    }
  }

  afterNavigate(() => {
    if (!$newConversation) resetConversation();
    focusChatInput();
  });

  $: if (initialMessages) {
    setMessages(initialMessages);
  }

  function handleEdit(id: string, content: string) {
    const messageIndex = $messages.findIndex((message) => message.id === id);

    if (messageIndex === -1) return;

    const updatedMessages = [...$messages];
    updatedMessages[messageIndex].content = content;

    setMessages(updatedMessages);

    reload({
      options: {
        body: {
          modelId: selectedModel?.value,
          agentId: agent?.id,
          conversationId: $conversationStore?.id,
          messageId: id
        }
      }
    });
  }
</script>

<svelte:window on:keydown={handleCopyLastMessage} on:keydown={handleFocusChatInput} />

{#if $messages.length === 0}
  <Select
    bind:value={selectedModel}
    items={models}
    placeholder="Select model..."
    on:change={(e) => localStorage.setItem("selectedModel", JSON.stringify(selectedModel))}
    {ariaListOpen}
    clearable={false}
  />
{:else if selectedModel}
  <p>{agent?.name ? `${agent.name} (${selectedModel.label})` : selectedModel.label}</p>
{/if}

{#if apiKeys?.eleven && $voices}
  <Select
    bind:value={selectedVoice}
    items={voiceItems}
    placeholder="Select voice..."
    on:change={(e) => localStorage.setItem("selectedVoice", JSON.stringify(selectedVoice))}
    {ariaListOpen}
    clearable={false}
  />
  <AdvancedTtsSettings />
{/if}

<section>
  <div class="chat-list">
    {#each $messages as message}
      <Message
        {message}
        voice={selectedVoice?.value}
        modelId={$selectedTtsModel?.value}
        siblings={getMessageSiblings($conversationStore?.messages, message.id)}
        onEdit={handleEdit}
        isLoading={$isLoading}
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
          options: {
            body: {
              modelId: selectedModel?.value,
              agentId: agent?.id,
              conversationId: $conversationStore?.id,
              regenerate: true
            }
          }
        })}>Regenerate</Button
    >
  {/if}
  {#if $error}
    <p class="error">There was an error while getting a response from the AI.</p>
    <Button
      on:click={() =>
        reload({
          options: {
            body: {
              modelId: selectedModel?.value,
              agentId: agent?.id,
              conversationId: $conversationStore?.id
            }
          }
        })}>Try again</Button
    >
  {/if}

  <form
    on:submit={(e) =>
      handleSubmit(e, {
        options: {
          body: {
            modelId: selectedModel?.value,
            agentId: agent?.id,
            conversationId: $conversationStore?.id
          }
        }
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
</section>
