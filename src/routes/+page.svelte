<script lang="ts">
  import Message from "$lib/Message.svelte";
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
      <li>
        <Message {message} />
      </li>
    {/each}
  </ul>

  <form on:submit={handleSubmit}>
    <textarea bind:value={$input} placeholder="Chat with Mistral" cols="200" rows="10" />
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

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    margin: 0.5rem;
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
