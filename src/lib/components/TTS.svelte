<script lang="ts">
  import { page } from "$app/stores";
  import { createEventDispatcher } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";
  import { ttsGenerating } from "$lib/stores/tts-generating-store";
  import { Loader } from "lucide-svelte";
  import { generateAudioFilename } from "$lib/filename";

  const dispatch = createEventDispatcher();

  export let text: string;
  export let voice: string | undefined;

  let streamSupported = true;

  const tts = async (): Promise<void> => {
    if (!window.MediaSource) {
      console.error("MediaSource API is not supported in this browser");
      streamSupported = false;
    }

    if (!MediaSource.isTypeSupported("audio/mpeg")) {
      streamSupported = false;
    }

    if ($ttsGenerating) {
      console.warn("TTS is already generating");
      return;
    }

    ttsGenerating.set(true);

    if (!streamSupported) {
      const response = await fetch(`/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text, userId: $page.data.session?.user?.id, voice, stream: false })
      });

      if (!response.ok) {
        ttsGenerating.set(false);
        dispatch("playAudio", null);
        const error = await response.json();
        toast.error(error.message);
        return;
      }

      const audioBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(audioBlob);
      dispatch("playAudio", downloadUrl);
      dispatch("downloadAudio", { downloadUrl, filename: generateAudioFilename(text) });
      ttsGenerating.set(false);
      return;
    }

    const mediaSource = new MediaSource();
    const audioUrl = URL.createObjectURL(mediaSource);
    const chunks: Uint8Array[] = [];

    dispatch("playAudio", audioUrl);

    mediaSource.addEventListener(
      "sourceopen",
      async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg"); // Adjust MIME type if necessary
          const response = await fetch(`/api/tts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              text,
              userId: $page.data.session?.user?.id,
              voice,
              stream: true
            })
          });

          if (!response.ok) {
            mediaSource.endOfStream("network");

            dispatch("playAudio", null);

            const error = await response.json();
            toast.error(error.message);
            ttsGenerating.set(false);
            return;
          }

          const stream = response.body;

          if (!stream) return;

          const reader = stream.getReader();
          const pump = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) {
              const audioBlob = new Blob(chunks, { type: "audio/mpeg" });
              const downloadUrl = URL.createObjectURL(audioBlob);
              dispatch("downloadAudio", { downloadUrl, filename: generateAudioFilename(text) });
              mediaSource.endOfStream();
              ttsGenerating.set(false);
              return;
            }
            chunks.push(value);
            sourceBuffer.appendBuffer(value);
            sourceBuffer.addEventListener("updateend", pump, { once: true });
          };

          pump();
        } catch (error) {
          console.error("Error fetching or processing audio", error);
          mediaSource.endOfStream("network");
          ttsGenerating.set(false);
        }
      },
      { once: true }
    );
  };
</script>

<Button on:click={tts} disabled={$ttsGenerating}>
  {#if $ttsGenerating}
    <Loader />
  {/if}
  <span>{$ttsGenerating ? "Generating..." : "Speak"}</span>
</Button>
