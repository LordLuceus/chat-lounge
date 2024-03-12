<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import Message from "$lib/components/Message.svelte";
  import { useChat } from "ai/svelte";
  import { signIn, signOut } from "@auth/sveltekit/client";
  import { enhance } from "$app/forms";
  import type { PageData } from "./$types";
  import { toast } from "svelte-sonner";

  export let data: PageData;
  let finishSound: HTMLAudioElement;
  let currentAudio = "";
  let audioBlobUrl = "";
  let audioFileName = `elevenlabs_${new Date().toISOString()}.mp3`;

  const { input, handleSubmit, messages, reload } = useChat({
    onFinish: () => {
      finishSound?.play();
    },
    body: { userId: data.session?.user?.id }
  });

  let chatForm: HTMLFormElement;

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
    window.addEventListener("keydown", handleCopyLastMessage);
  });

  onDestroy(() => {
    if (browser) window.removeEventListener("keydown", handleCopyLastMessage);
  });

  function setCurrentAudio(src: string) {
    currentAudio = src;
  }

  function setAudioBlobUrl(url: string) {
    audioBlobUrl = url;
  }
</script>

<svelte:head>
  <title>ChatMate</title>
  <meta
    name="description"
    content="ChatMate: Engage with cutting-edge AI models for instant text and voice conversations. Experience seamless, intelligent interactions tailored to your needs. Perfect for learning, entertainment, and efficient communication."
  />
</svelte:head>

{#if data.session}
  {#if !data.keys}
    <p>You don't have any API keys set.</p>
    <a href="/settings">Go to settings</a>
  {:else if !data.keys.mistral && !data.keys.openai}
    <p>You need either a Mistral or an OpenAI API key to chat.</p>
    <a href="/settings">Go to settings</a>
  {:else}
    <section>
      <ul>
        {#each $messages as message}
          <li>
            <Message
              {message}
              on:playAudio={(e) => setCurrentAudio(e.detail)}
              on:downloadAudio={(e) => setAudioBlobUrl(e.detail)}
            />
          </li>
        {/each}
      </ul>
      {#if $messages.at(-1)?.role === "assistant"}
        <button on:click={() => reload()}>Regenerate</button>
      {/if}

      <form on:submit={handleSubmit} bind:this={chatForm}>
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
  <section>
    <h2>Please sign in to chat</h2>
  </section>
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
</style>
