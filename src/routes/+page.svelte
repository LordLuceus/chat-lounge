<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
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
  let modelValue = models[0].value;
  $: selectedModel = models.find((model) => model.value === modelValue)?.label;
  let modelSelectOpen = false;

  const { error, input, handleSubmit, messages, reload } = useChat({
    onFinish: () => {
      finishSound?.play();
    },
    body: { userId: data.session?.user?.id, model: modelValue }
  });

  function handleMessageSubmit(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
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
      // Check if the stored model is valid
      if (models.find((model) => model.value === storedModel)) {
        modelValue = storedModel;
      }
    }
  });

  function setCurrentAudio(src: string) {
    currentAudio = src;
  }

  function setAudioBlobUrl(url: string) {
    audioBlobUrl = url;
  }

  function closeAndFocusTrigger(triggerId: string) {
    modelSelectOpen = false;
    tick().then(() => {
      document.getElementById(triggerId)?.focus();
    });
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
      <Popover.Root bind:open={modelSelectOpen} let:ids>
        <Popover.Trigger asChild let:builder>
          <Button
            builders={[builder]}
            variant="outline"
            role="combobox"
            aria-expanded={modelSelectOpen}
            class="w-[200px] justify-between"
          >
            {selectedModel}
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-[200px] p-0">
          <Command.Root>
            <Command.Input placeholder="Select model..." class="h-9" />
            <Command.Empty>No model found.</Command.Empty>
            <Command.Group>
              {#each models as model}
                <Command.Item
                  value={model.value}
                  onSelect={(currentValue) => {
                    modelValue = currentValue;
                    closeAndFocusTrigger(ids.trigger);
                    localStorage.setItem("selectedModel", modelValue);
                  }}
                >
                  {model.label}
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>
    {:else}
      <p>{selectedModel}</p>
    {/if}
    <section>
      <div class="chat-list">
        {#each $messages as message}
          <Message
            {message}
            on:playAudio={(e) => setCurrentAudio(e.detail)}
            on:downloadAudio={(e) => setAudioBlobUrl(e.detail)}
          />
        {/each}
      </div>
      {#if $messages.at(-1)?.role === "assistant"}
        <button
          on:click={() =>
            reload({ options: { body: { userId: data.session?.user?.id, model: modelValue } } })}
          >Regenerate</button
        >
      {/if}
      {#if $error}
        <p class="error">There was an error while getting a response from the AI.</p>
        <Button
          on:click={() =>
            reload({ options: { body: { userId: data.session?.user?.id, model: modelValue } } })}
          >Try again</Button
        >
      {/if}

      <form
        on:submit={(e) =>
          handleSubmit(e, {
            options: { body: { userId: data.session?.user?.id, model: modelValue } }
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
