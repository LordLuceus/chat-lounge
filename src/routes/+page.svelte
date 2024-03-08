<script lang="ts">
  import { onMount } from "svelte";
  import Message from "$lib/Message.svelte";
  import { useChat } from "ai/svelte";
  import { page } from "$app/stores";
  import { signIn, signOut } from "@auth/sveltekit/client";
  import { enhance } from "$app/forms";
  import type { ActionData } from "./$types";

  let finishSound: HTMLAudioElement;

  const { input, handleSubmit, messages, reload } = useChat({
    onFinish: () => {
      finishSound?.play();
    },
    body: { userId: $page.data.session?.user?.id }
  });

  let chatForm: HTMLFormElement;

  function handleMessageSubmit(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  }

  onMount(() => {
    chatForm?.querySelector("textarea")?.focus();
    finishSound = new Audio("/assets/typing.wav");
  });

  export let form: ActionData;
  let apiKeyInput: HTMLInputElement;

  function handleApiKeyError() {
    apiKeyInput?.focus();
  }

  $: if (form?.message) {
    handleApiKeyError();
  }
</script>

<svelte:head>
  <title>Chat</title>
  <meta name="description" content="Chat" />
</svelte:head>

{#if $page.data.session}
  {#if !$page.data.hasApiKeys}
    <section>
      <h2>Add your API keys to chat</h2>
      <form method="POST" use:enhance>
        <label>
          <span>Mistral API Key</span>
          <input type="text" name="mistralApiKey" bind:this={apiKeyInput} />
        </label>
        {#if form?.message}
          <p role="alert">{form.message}</p>
        {/if}
        <button type="submit">Save</button>
      </form>
    </section>
  {:else}
    <section>
      <ul>
        {#each $messages as message}
          <li>
            <Message {message} />
          </li>
        {/each}
      </ul>
      {#if $messages.at(-1)?.role === "assistant"}
        <button on:click={() => reload()}>Regenerate</button>
      {/if}

      <form on:submit={handleSubmit} bind:this={chatForm}>
        <textarea
          bind:value={$input}
          placeholder="Chat with Mistral"
          cols="200"
          rows="1"
          on:keydown={handleMessageSubmit}
          autocapitalize="on"
        />
        <button type="submit">Send</button>
      </form>
    </section>
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

  textarea {
    margin: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid #ccc;
    width: 100%;
  }
</style>
