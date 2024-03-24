<script lang="ts">
  // TODO: This component is getting kind of massive. Consider splitting it into smaller components. We'll have to do it eventually anyway, once we start implementing threads.

  import Message from "$lib/components/Message.svelte";
  import Recorder from "$lib/components/Recorder.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { generateTTS } from "$lib/services/tts-service";
  import { useChat } from "ai/svelte";
  import { onMount } from "svelte";
  import Select from "svelte-select";
  import { toast } from "svelte-sonner";
  import type { PageData } from "./$types";

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

  export let data: PageData;

  let chatForm: HTMLFormElement;
  let finishSound: HTMLAudioElement;
  let currentAudio: string | null = null;
  let audioBlobUrl = "";
  let audioFileName = `TTS_${new Date().toISOString()}.mp3`;
  let voiceMessage: string;

  let selectedModel = models.at(0);

  let selectedVoice: { label: string; value: string } | undefined = data.voices
    ?.map((voice) => ({
      label: `${voice.name} (${voice.category})`,
      value: voice.voice_id
    }))
    .at(0);

  let selectedAgent: { label: string; value: string } | null = null;

  $: voiceItems = data.voices?.map((voice) => ({
    label: `${voice.name} (${voice.category})`,
    value: voice.voice_id
  }));

  $: agentItems = data.agents?.map((agent) => ({
    label: agent.name,
    value: agent.id
  }));

  const { append, error, handleSubmit, input, isLoading, messages, reload, stop } = useChat({
    onFinish: async (message) => {
      if (voiceMessage) {
        // It's a voice message, don't play the sound. Get a TTS response instead.
        await generateTTS({
          text: message.content,
          userId: data.session?.user?.id,
          voice: selectedVoice?.value,
          onPlayAudio: (audioUrl: string | null) => setCurrentAudio(audioUrl),
          onDownloadAudio: ({ downloadUrl, filename }) =>
            setAudioUrlAndFilename(downloadUrl, filename),
          onError: (error: string) => toast.error(error)
        });
        setVoiceMessage("");
      } else {
        finishSound.play();
      }
    },
    body: {
      userId: data.session?.user?.id,
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
    toast.success("Last message copied to clipboard");
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
      if (data.voices?.find((voice) => voice.voice_id === parsedVoice.value)) {
        selectedVoice = parsedVoice;
      }
    }

    const storedAgent = localStorage.getItem("selectedAgent");
    if (storedAgent) {
      const parsedAgent: { label: string; value: string } = JSON.parse(storedAgent);
      // Check if the stored agent is valid
      if (data.agents?.find((agent) => agent.id === parsedAgent.value)) {
        selectedAgent = parsedAgent;
      }
    }
  });

  function setCurrentAudio(src: string | null) {
    currentAudio = src;
  }

  function setAudioUrlAndFilename(url: string, filename: string) {
    audioBlobUrl = url;
    audioFileName = filename;
  }

  const ariaListOpen = (label: string, count: number) => {
    return `${label}, ${count} ${count < 2 ? "option" : "options"} available.`;
  };

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
              userId: data.session?.user?.id,
              model: selectedModel?.value,
              agent: selectedAgent?.value
            }
          }
        }
      );
    }
  }
</script>

<svelte:window on:keydown={handleCopyLastMessage} />

<svelte:head>
  <title>ChatMate</title>
  <meta
    name="description"
    content="ChatMate: Engage with cutting-edge AI models for instant text and voice conversations. Experience seamless, intelligent interactions tailored to your needs. Perfect for learning, entertainment, and efficient communication."
  />
</svelte:head>

<h1>ChatMate</h1>

{#if data.session}
  {#if !data.keys}
    <p>You don't have any API keys set.</p>
    <a href="/settings">Go to settings</a>
  {:else if !data.keys.mistral}
    <p>You need a Mistral API key to continue.</p>
    <a href="/settings">Go to settings</a>
  {:else}
    {#if $messages.length === 0}
      <Select
        bind:value={selectedModel}
        items={models}
        placeholder="Select model..."
        on:change={(e) => localStorage.setItem("selectedModel", JSON.stringify(selectedModel))}
        {ariaListOpen}
        clearable={false}
      />
      {#if data.agents && data.agents.length > 0}
        <Select
          bind:value={selectedAgent}
          items={agentItems}
          placeholder="Select agent..."
          on:change={(e) => localStorage.setItem("selectedAgent", JSON.stringify(selectedModel))}
          {ariaListOpen}
        />
      {/if}
    {:else}
      <p>{selectedModel?.label}</p>
      <p>{selectedAgent?.label}</p>
    {/if}

    {#if data.keys.eleven && data.voices}
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
            on:playAudio={(e) => setCurrentAudio(e.detail)}
            on:downloadAudio={(e) =>
              setAudioUrlAndFilename(e.detail.downloadUrl, e.detail.filename)}
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
                    userId: data.session?.user?.id,
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
                  userId: data.session?.user?.id,
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
                userId: data.session?.user?.id,
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
        <Button type="submit">Send</Button>
      </form>
      {#if data.keys.openai}
        <Recorder {setVoiceMessage} />
      {/if}
    </section>
    {#if currentAudio}
      <section aria-label="Audio player">
        <audio src={currentAudio} controls autoplay />
        {#if audioBlobUrl}
          <a href={audioBlobUrl} download={audioFileName}> Download audio </a>
        {/if}
      </section>
    {/if}
  {/if}
{:else}
  <p>Please sign in to continue.</p>
{/if}

<style>
  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 0.6;
  }

  form {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .chat-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
    width: 100%;
  }
</style>
