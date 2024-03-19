<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import Select from "svelte-select";
  import Message from "$lib/components/Message.svelte";
  import { useChat } from "ai/svelte";
  import { signIn, signOut } from "@auth/sveltekit/client";
  import type { PageData } from "./$types";
  import { toast } from "svelte-sonner";

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
  let currentAudio = "";
  let audioBlobUrl = "";
  let audioFileName = `TTS_${new Date().toISOString()}.mp3`;

  let selectedModel = models[0];

  let selectedVoice: { label: string; value: string } | undefined = data.voices?.map((voice) => ({
    label: `${voice.name} (${voice.category})`,
    value: voice.voice_id
  }))[0];

  $: voiceItems = data.voices?.map((voice) => ({
    label: `${voice.name} (${voice.category})`,
    value: voice.voice_id
  }));

  const { error, input, handleSubmit, messages, reload } = useChat({
    onFinish: () => {
      finishSound?.play();
    },
    body: { userId: data.session?.user?.id, model: selectedModel.value }
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
    if (event.ctrlKey && event.shiftKey && event.code === "KeyC") {
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
  });

  function setCurrentAudio(src: string) {
    currentAudio = src;
  }

  function setAudioBlobUrl(url: string) {
    audioBlobUrl = url;
  }

  const ariaListOpen = (label: string, count: number) => {
    return `${label}, ${count} ${count < 2 ? "option" : "options"} available.`;
  };
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
    {:else}
      <p>{selectedModel.label}</p>
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
            on:downloadAudio={(e) => setAudioBlobUrl(e.detail)}
          />
        {/each}
      </div>
      {#if $messages.at(-1)?.role === "assistant"}
        <button
          on:click={() =>
            reload({
              options: { body: { userId: data.session?.user?.id, model: selectedModel.value } }
            })}>Regenerate</button
        >
      {/if}
      {#if $error}
        <p class="error">There was an error while getting a response from the AI.</p>
        <Button
          on:click={() =>
            reload({
              options: { body: { userId: data.session?.user?.id, model: selectedModel.value } }
            })}>Try again</Button
        >
      {/if}

      <form
        on:submit={(e) =>
          handleSubmit(e, {
            options: { body: { userId: data.session?.user?.id, model: selectedModel.value } }
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
