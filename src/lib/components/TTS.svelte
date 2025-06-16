<script lang="ts">
  import Toast from "$lib/components/Toast.svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    audioFilename,
    downloadUrl,
    newConversation,
    selectedTtsModel,
    selectedVoice,
    ttsGenerating,
    ttsProps
  } from "$lib/stores";
  import { Loader, Speech } from "@lucide/svelte";
  import { onDestroy } from "svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    text: string;
  }

  const { text }: Props = $props();

  let controller: AbortController;
  let signal: AbortSignal;

  const handleDownloadAudio = ({ url, filename }: { url: string; filename: string }) => {
    audioFilename.set(filename);
    downloadUrl.set(url);
  };

  const handleError = (error: string) => {
    toast.error(Toast, { componentProps: { text: error } });
  };

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
