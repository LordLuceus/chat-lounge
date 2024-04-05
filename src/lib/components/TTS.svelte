<script lang="ts">
  import Toast from "$lib/components/Toast.svelte";
  import { Button } from "$lib/components/ui/button";
  import { generateTTS } from "$lib/services/tts-service";
  import { audioFilename, currentAudioUrl, downloadUrl } from "$lib/stores/audio-store";
  import { ttsGenerating } from "$lib/stores/tts-generating-store";
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
