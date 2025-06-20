<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    newConversation,
    selectedTtsModel,
    selectedVoice,
    ttsGenerating,
    ttsProps
  } from "$lib/stores";
  import { Loader, Speech } from "@lucide/svelte";
  import { onDestroy } from "svelte";

  interface Props {
    text: string;
  }

  const { text }: Props = $props();

  let controller: AbortController;
  let signal: AbortSignal;

  const tts = (): void => {
    controller = new AbortController();
    signal = controller.signal;
    ttsProps.set({ text, voice: $selectedVoice?.value, signal, modelId: $selectedTtsModel?.value });
  };

  onDestroy(() => {
    if ($newConversation) return;
    controller?.abort();
  });
</script>

<Button onclick={tts} disabled={$ttsGenerating}>
  {#if $ttsGenerating}
    <Loader />
  {:else}
    <Speech />
  {/if}
  <span>{$ttsGenerating ? "Generating..." : "Speak"}</span>
</Button>
