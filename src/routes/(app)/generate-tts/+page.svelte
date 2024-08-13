<script lang="ts">
  import { browser } from "$app/environment";
  import TtsSettings from "$lib/components/TtsSettings.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import {
    audioFilename,
    currentAudioUrl,
    downloadUrl,
    selectedTtsModel,
    selectedVoice,
    ttsProps
  } from "$lib/stores";
  import { onDestroy, onMount } from "svelte";

  let text: string;

  let controller: AbortController;
  let signal: AbortSignal;

  onMount(() => {
    controller = new AbortController();
    signal = controller.signal;
  });

  onDestroy(() => {
    if (browser) {
      resetAudio();
    }
  });

  function handleSubmit() {
    ttsProps.set({ text, voice: $selectedVoice?.value, signal, modelId: $selectedTtsModel?.value });
  }

  function resetAudio() {
    ttsProps.set(null);
    currentAudioUrl.set(null);
    downloadUrl.set("");
    audioFilename.set("");
    controller?.abort();

    controller = new AbortController();
    signal = controller.signal;
  }
</script>

<svelte:head>
  <title>Generate Speech | ChatLounge</title>
  <meta name="description" content="Generate speech using ElevenLabs AI" />
</svelte:head>

<h1>Generate Speech</h1>

<TtsSettings />
<Textarea bind:value={text} placeholder="Type your message..." rows={1} cols={200} autofocus />
<Button on:click={handleSubmit}>Generate</Button>
