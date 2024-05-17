<script lang="ts">
  import Toast from "$lib/components/Toast.svelte";
  import { Button } from "$lib/components/ui/button";
  import { generateTTS } from "$lib/services/tts-service";
  import {
    audioFilename,
    conversationStore,
    currentAudioUrl,
    downloadUrl,
    newConversation,
    ttsGenerating,
    ttsText
  } from "$lib/stores";
  import { Loader, Speech } from "lucide-svelte";
  import { onDestroy } from "svelte";
  import { toast } from "svelte-sonner";

  export let text: string;
  export let voice: string | undefined;

  let controller: AbortController;
  let signal: AbortSignal;

  const handleDownloadAudio = ({ url, filename }: { url: string; filename: string }) => {
    audioFilename.set(filename);
    downloadUrl.set(url);
  };

  const handleError = (error: string) => {
    toast.error(Toast, { componentProps: { text: error } });
  };

  const tts = async (): Promise<void> => {
    if (!$conversationStore) {
      ttsText.set(text);
      ttsGenerating.set(true);
      return;
    }

    controller = new AbortController();
    signal = controller.signal;
    await generateTTS({
      text,
      voice,
      onPlayAudio: (audioUrl) => currentAudioUrl.set(audioUrl),
      onDownloadAudio: ({ downloadUrl, filename }) =>
        handleDownloadAudio({ url: downloadUrl, filename }),
      onError: handleError,
      signal
    });
  };

  onDestroy(() => {
    if ($newConversation) return;
    controller?.abort();
  });
</script>

<Button on:click={tts} disabled={$ttsGenerating}>
  {#if $ttsGenerating}
    <Loader />
  {:else}
    <Speech />
  {/if}
  <span>{$ttsGenerating ? "Generating..." : "Speak"}</span>
</Button>
