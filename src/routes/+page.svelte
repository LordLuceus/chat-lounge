<script lang="ts">
  import { useChat } from "ai/svelte";
  import { Howl } from "howler";
  import SvelteMarkdown from "svelte-markdown";

  const sound = new Howl({
    src: ["/assets/typing.wav"]
  });

  const { input, handleSubmit, messages } = useChat({
    onFinish: () => {
      sound.play();
    }
  });
</script>

<svelte:head>
  <title>Chat</title>
  <meta name="description" content="Chat" />
</svelte:head>

<section>
  <h1>Awesome Chat App</h1>
  <ul>
    {#each $messages as message}
      {#if message.role === "system"}
        // Don't show system messages
      {:else if message.role === "user"}
        <li>{message.role}: {message.content}</li>
      {:else}
        <li>{message.role}: <SvelteMarkdown source={message.content} /></li>
      {/if}
    {/each}
  </ul>

  <form on:submit={handleSubmit}>
    <textarea bind:value={$input} />
    <button type="submit">Send</button>
  </form>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 0.6;
  }
</style>
