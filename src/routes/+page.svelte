<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import Message from "$lib/components/Message.svelte";
  import { useChat } from "ai/svelte";
  import { signIn, signOut } from "@auth/sveltekit/client";
  import { enhance } from "$app/forms";
  import type { PageData } from "./$types";

  export let data: PageData;
  let finishSound: HTMLAudioElement;

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

  onMount(() => {
    (document.querySelector(".chat-input") as HTMLTextAreaElement)?.focus();
    finishSound = new Audio("/assets/typing.wav");
  });
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
