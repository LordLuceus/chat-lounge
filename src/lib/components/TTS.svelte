<script lang="ts">
  export let text: string;

  const tts = async (): Promise<void> => {
    if (!window.MediaSource) {
      console.error("MediaSource API is not supported in this browser");
      return;
    }

    const mediaSource = new MediaSource();
    const audioUrl = URL.createObjectURL(mediaSource);

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
            body: JSON.stringify({ text })
          });
          const stream = response.body;

          if (!stream) throw new Error("No audio stream available");

          const reader = stream.getReader();
          const pump = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) {
              mediaSource.endOfStream();
              return;
            }
            sourceBuffer.appendBuffer(value);
            sourceBuffer.addEventListener("updateend", pump, { once: true });
          };

          pump();
        } catch (error) {
          console.error("Error fetching or processing audio", error);
          mediaSource.endOfStream("network");
        }
      },
      { once: true }
    );

    const audio = new Audio(audioUrl);
    audio.play();
  };
</script>

<button on:click={tts}>Speak</button>
