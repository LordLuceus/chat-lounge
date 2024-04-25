<script lang="ts">
  import { browser } from "$app/environment";
  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Message from "$lib/components/Message.svelte";
  import Recorder from "$lib/components/Recorder.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import type { Message as ExtendedMessage } from "$lib/helpers/conversation-helpers";
  import { getMessageSiblings } from "$lib/helpers/conversation-helpers";
  import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
  import { generateTTS } from "$lib/services/tts-service";
  import { audioFilename, currentAudioUrl, downloadUrl } from "$lib/stores/audio-store";
  import { conversationStore } from "$lib/stores/conversation-store";
  import { voices } from "$lib/stores/voices-store";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { useChat } from "ai/svelte";
  import { onDestroy, onMount } from "svelte";
  import Select from "svelte-select";
  import { toast } from "svelte-sonner";

  interface SelectItem {
    label: string;
    value: string;
  }

  export let agentId: string | undefined = undefined;
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
          body: JSON.stringify({ agentId, modelId: selectedModel?.value, messages: $messages })
        })
      ).json(),
    onSuccess: () => client.invalidateQueries({ queryKey: ["conversations"] })
  });

  const { append, error, handleSubmit, input, isLoading, messages, reload, setMessages, stop } =
    useChat({
      onFinish: async (message) => {
        if (voiceMessage) {
          await generateTTS({
            text: message.content,
            voice: selectedVoice?.value,
            onPlayAudio: (audioUrl: string | null) => currentAudioUrl.set(audioUrl),
            onDownloadAudio: ({ downloadUrl, filename }) =>
              setDownloadUrlAndFilename(downloadUrl, filename),
            onError: (error: string) => toast.error(error),
            signal
          });
          setVoiceMessage("");
        } else {
          finishSound.play();
        }

        if (!$conversationStore) {
          $createConversationMutation.mutate(undefined, {
            onSuccess: (data) => {
              if (data.id) {
                goto(`${agentId ? "/agents/" + agentId : ""}/conversations/${data.id}`);
                client.invalidateQueries({ queryKey: ["conversations"] });
              }
            }
          });
        }

        if ($conversationStore) client.invalidateQueries({ queryKey: ["conversations"] });
      },
      body: {
        modelId: selectedModel?.value,
        agentId,
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

  function focusChatInput(event: KeyboardEvent) {
    if (event.key === "Escape" && event.shiftKey) {
      event.preventDefault();
      const chatInput = document.querySelector(".chat-input") as HTMLTextAreaElement;
      chatInput.focus();
    }
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

      resetAudio();
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

  function setDownloadUrlAndFilename(url: string, filename: string) {
    downloadUrl.set(url);
    audioFilename.set(filename);
  }

  function setVoiceMessage(message: string) {
    voiceMessage = message;
  }

  function resetAudio() {
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
              agentId,
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

  const ariaListOpen = (label: string, count: number) => {
    return `${label}, ${count} ${count < 2 ? "option" : "options"} available.`;
  };

  function resetConversation() {
    setMessages(initialMessages || []);
    resetAudio();
    handleModelSelection();

    if ($page.url.pathname === "/") {
      conversationStore.set(null);
    }
  }

  afterNavigate(() => {
    resetConversation();
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
          agentId,
          conversationId: $conversationStore?.id,
          messageId: id
        }
      }
    });
  }
</script>

<svelte:window on:keydown={handleCopyLastMessage} on:keydown={focusChatInput} />

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
  <p>{selectedModel.label}</p>
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
{/if}

<section>
  <div class="chat-list">
    {#each $messages as message}
      <Message
        {message}
        voice={selectedVoice?.value}
        siblings={getMessageSiblings($conversationStore?.messages, message.id)}
        onEdit={handleEdit}
        isLoading={$isLoading}
      />
    {/each}
  </div>
  {#if $messages.at(-1)?.role === "assistant"}
    {#if $isLoading}
      <Button on:click={stop}>Stop generating</Button>
    {:else}
      <Button
        on:click={() =>
          reload({
            options: {
              body: {
                modelId: selectedModel?.value,
                agentId,
                conversationId: $conversationStore?.id,
                regenerate: true
              }
            }
          })}>Regenerate</Button
      >
    {/if}
  {/if}
  {#if $error}
    <p class="error">There was an error while getting a response from the AI.</p>
    <Button
      on:click={() =>
        reload({
          options: {
            body: {
              modelId: selectedModel?.value,
              agentId,
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
            agentId,
            conversationId: $conversationStore?.id
          }
        }
      })}
    bind:this={chatForm}
  >
    <Textarea
      bind:value={$input}
      on:keydown={handleMessageSubmit}
      placeholder="Type your message..."
      class="chat-input"
      rows={1}
      cols={200}
      autofocus
    />
  </form>
  {#if apiKeys?.openai}
    <Recorder {setVoiceMessage} />
  {/if}
</section>

{#if $currentAudioUrl}
  <section aria-label="Audio player">
    <audio src={$currentAudioUrl} controls autoplay />
    {#if $downloadUrl}
      <a href={$downloadUrl} download={$audioFilename}> Download audio </a>
    {/if}
  </section>
{/if}
