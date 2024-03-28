<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import { generateTTS } from "$lib/services/tts-service";
  import { ttsGenerating } from "$lib/stores/tts-generating-store";
  import { Loader, Speech } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";
  import { toast } from "svelte-sonner";

  const dispatch = createEventDispatcher();

  export let text: string;
  export let voice: string | undefined;

  const handlePlayAudio = (audioUrl: string | null) => {
    dispatch("playAudio", audioUrl);
  };

  const handleDownloadAudio = ({
    downloadUrl,
    filename
  }: {
    downloadUrl: string;
    filename: string;
  }) => {
    dispatch("downloadAudio", { downloadUrl, filename });
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  const tts = async (): Promise<void> => {
    await generateTTS({
      text,
      userId: $page.data.session?.user?.id,
      voice,
      onPlayAudio: handlePlayAudio,
      onDownloadAudio: handleDownloadAudio,
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
