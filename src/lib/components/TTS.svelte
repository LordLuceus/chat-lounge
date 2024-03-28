<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import { generateTTS } from "$lib/services/tts-service";
  import { audioFilename, currentAudioUrl, downloadUrl } from "$lib/stores/audio-store";
  import { ttsGenerating } from "$lib/stores/tts-generating-store";
  import { Loader, Speech } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  export let text: string;
  export let voice: string | undefined;

  const handleDownloadAudio = ({ url, filename }: { url: string; filename: string }) => {
    audioFilename.set(filename);
    downloadUrl.set(url);
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  const tts = async (): Promise<void> => {
    await generateTTS({
      text,
      userId: $page.data.session?.user?.id,
      voice,
      onPlayAudio: (audioUrl) => currentAudioUrl.set(audioUrl),
      onDownloadAudio: ({ downloadUrl, filename }) =>
        handleDownloadAudio({ url: downloadUrl, filename }),
      onError: handleError
    });
  };
</script>

<Button on:click={tts} disabled={$ttsGenerating}>
  {#if $ttsGenerating}
    <Loader />
  {:else}
    <Speech />
  {/if}
  <span>{$ttsGenerating ? "Generating..." : "Speak"}</span>
</Button>
