<script lang="ts">
  import { browser } from "$app/environment";
  import CharacterCounter from "$lib/components/CharacterCounter.svelte";
  import TtsSettings from "$lib/components/TtsSettings.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import {
    audioFilename,
    currentAudioUrl,
    downloadUrl,
    selectedTtsModel,
    selectedVoice,
    ttsGenerating,
    ttsProps
  } from "$lib/stores";
  import { Loader, Speech } from "lucide-svelte";
  import { onDestroy, onMount } from "svelte";

  let text: string = $state();

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
<Textarea
  bind:value={text}
  placeholder="Type or paste any text..."
  rows={1}
  cols={200}
  autofocus
  maxlength={$selectedTtsModel?.characterLimit}
/>
<CharacterCounter characterLimit={$selectedTtsModel?.characterLimit || 10000} value={text} />
<Button on:click={handleSubmit} disabled={$ttsGenerating}>
  {#if $ttsGenerating}
    <Loader />
  {:else}
    <Speech />
  {/if}
  <span>{$ttsGenerating ? "Generating..." : "Speak"}</span>
</Button>
