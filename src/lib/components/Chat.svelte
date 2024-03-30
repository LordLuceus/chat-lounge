<script lang="ts">
  import Message from "$lib/components/Message.svelte";
  import Recorder from "$lib/components/Recorder.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { generateTTS } from "$lib/services/tts-service";
  import { audioFilename, currentAudioUrl, downloadUrl } from "$lib/stores/audio-store";
  import type { Voice } from "$lib/types/elevenlabs/voices";
  import { useChat } from "ai/svelte";
  import { onMount } from "svelte";
  import Select from "svelte-select";
  import { toast } from "svelte-sonner";

  export let agents: { id: string; name: string; description: string | null }[] | undefined;
  export let apiKeys: { mistral: boolean; openai: boolean; eleven: boolean } | undefined;
  export let voices: Voice[] | undefined;
  export let userId: string | undefined;

  const models = [
    {
      label: "Mistral Large",
      value: "mistral-large-latest"
    },
    {
      label: "Mistral Medium",
      value: "mistral-medium-latest"
    },
    {
      label: "Mistral Small",
      value: "mistral-small-latest"
    }
  ];

  let chatForm: HTMLFormElement;
  let finishSound: HTMLAudioElement;
  let voiceMessage: string;

  let selectedModel = models.at(0);

  let selectedVoice: { label: string; value: string } | undefined = voices
    ?.map((voice) => ({
      label: `${voice.name} (${voice.category})`,
      value: voice.voice_id
    }))
    .at(0);

  let selectedAgent: { label: string; value: string } | null = null;

  $: voiceItems = voices?.map((voice) => ({
    label: `${voice.name} (${voice.category})`,
    value: voice.voice_id
  }));

  $: agentItems = agents?.map((agent) => ({
    label: agent.name,
    value: agent.id
  }));

  const { append, error, handleSubmit, input, isLoading, messages, reload, stop } = useChat({
    onFinish: async (message) => {
      if (voiceMessage) {
        // It's a voice message, don't play the sound. Get a TTS response instead.
        await generateTTS({
          text: message.content,
          userId,
          voice: selectedVoice?.value,
          onPlayAudio: (audioUrl: string | null) => currentAudioUrl.set(audioUrl),
          onDownloadAudio: ({ downloadUrl, filename }) =>
            setDownloadUrlAndFilename(downloadUrl, filename),
          onError: (error: string) => toast.error(error)
        });
        setVoiceMessage("");
      } else {
        finishSound.play();
      }
    },
    body: {
      model: selectedModel?.value,
      agent: null
    }
  });

  function handleMessageSubmit(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
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
    (document.querySelector(".chat-input") as HTMLTextAreaElement)?.focus();
    finishSound = new Audio("/assets/typing.wav");

    const storedModel = localStorage.getItem("selectedModel");
    if (storedModel) {
      const parsedModel: { label: string; value: string } = JSON.parse(storedModel);
      // Check if the stored model is valid
      if (models.find((model) => model.value === parsedModel.value)) {
        selectedModel = parsedModel;
      }
    }

    const storedVoice = localStorage.getItem("selectedVoice");
    if (storedVoice) {
      const parsedVoice: { label: string; value: string } = JSON.parse(storedVoice);
      // Check if the stored voice is valid
      if (voices?.find((voice) => voice.voice_id === parsedVoice.value)) {
        selectedVoice = parsedVoice;
      }
    }

    const storedAgent = localStorage.getItem("selectedAgent");
    if (storedAgent) {
      const parsedAgent: { label: string; value: string } = JSON.parse(storedAgent);
      // Check if the stored agent is valid
      if (agents?.find((agent) => agent.id === parsedAgent.value)) {
        selectedAgent = parsedAgent;
      }
    }
  });

  function setDownloadUrlAndFilename(url: string, filename: string) {
    downloadUrl.set(url);
    audioFilename.set(filename);
  }

  function setVoiceMessage(message: string) {
    voiceMessage = message;
  }

  $: {
    if (voiceMessage) {
      append(
        { content: voiceMessage, role: "user" },
        {
          options: {
            body: {
              model: selectedModel?.value,
              agent: selectedAgent?.value
            }
          }
        }
      );
    }
  }

  const ariaListOpen = (label: string, count: number) => {
    return `${label}, ${count} ${count < 2 ? "option" : "options"} available.`;
  };
</script>

<svelte:window on:keydown={handleCopyLastMessage} />

{#if $messages.length === 0}
  <Select
    bind:value={selectedModel}
    items={models}
    placeholder="Select model..."
    on:change={(e) => localStorage.setItem("selectedModel", JSON.stringify(selectedModel))}
    {ariaListOpen}
    clearable={false}
  />
  {#if agents && agents.length > 0}
    <Select
      bind:value={selectedAgent}
      items={agentItems}
      placeholder="Select agent..."
      on:change={(e) => localStorage.setItem("selectedAgent", JSON.stringify(selectedAgent))}
      {ariaListOpen}
    >
      <svelte:fragment slot="clear-icon">Clear selection</svelte:fragment>
    </Select>
  {/if}
{:else}
  {#if selectedModel}
    <p>{selectedModel.label}</p>
  {/if}
  {#if selectedAgent}
    <p>{selectedAgent.label}</p>
  {/if}
{/if}

{#if apiKeys?.eleven && voices}
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
      <Message {message} voice={selectedVoice?.value} />
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
                model: selectedModel?.value,
                agent: selectedAgent?.value
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
              model: selectedModel?.value,
              agent: selectedAgent?.value
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
            model: selectedModel?.value,
            agent: selectedAgent?.value
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
