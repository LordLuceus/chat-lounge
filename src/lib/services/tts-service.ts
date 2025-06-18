import { generateAudioFilename, ttsCleanup } from "$lib/helpers";
import { ttsGenerating } from "$lib/stores";

interface TTSOptions {
  audioElement: HTMLAudioElement;
  text: string;
  voice?: string;
  modelId?: string;
  onDownloadReady: (downloadOptions: { downloadUrl: string; filename: string }) => void;
  onError: (error: string) => void;
  signal: AbortSignal;
}

export async function generateTTS({
  audioElement,
  text,
  voice,
  modelId,
  onDownloadReady,
  onError,
  signal
}: TTSOptions): Promise<void> {
  text = ttsCleanup(text);
  ttsGenerating.set(true);

  // Clean up any previous media source
  if (audioElement.src.startsWith("blob:")) {
    URL.revokeObjectURL(audioElement.src);
  }

  // Fallback for browsers without MediaSource support
  const isStreamingSupported = window.MediaSource && MediaSource.isTypeSupported("audio/mpeg");
  if (!isStreamingSupported) {
    console.warn("MediaSource API not supported. Falling back to full download for playback.");
    try {
      const response = await fetch(`/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, stream: false, modelId }),
        signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch audio");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioElement.src = audioUrl;
      audioElement.play();
      onDownloadReady({ downloadUrl: audioUrl, filename: generateAudioFilename(text) });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      onError(error.message);
    } finally {
      ttsGenerating.set(false);
    }
    return;
  }

  const mediaSource = new MediaSource();
  audioElement.src = URL.createObjectURL(mediaSource);

  mediaSource.addEventListener(
    "sourceopen",
    async () => {
      URL.revokeObjectURL(audioElement.src);

      const allChunks: Uint8Array[] = [];
      const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");

      // How much audio to buffer ahead of the current time (in seconds)
      const MAX_BUFFER_AHEAD = 30;

      // --- Graceful Error Handling ---
      // This flag ensures we only show the error once and stop trying to fetch more data.
      let hasEncounteredError = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleError = (message: string, error?: any) => {
        if (hasEncounteredError) return;
        hasEncounteredError = true;
        console.error(message, error);
        onError(message);
        // CRITICAL: We do NOT call mediaSource.endOfStream() here.
        // This allows the browser to continue playing whatever is in the buffer.
        ttsGenerating.set(false); // Update UI state
      };

      try {
        const response = await fetch(`/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice, stream: true, modelId }),
          signal
        });

        if (!response.ok || !response.body) {
          const error = await response
            .json()
            .catch(() => ({ message: "An unknown network error occurred." }));
          throw new Error(error.message);
        }

        const reader = response.body.getReader();
        audioElement.play().catch((e) => console.warn("Autoplay was blocked:", e));

        // This is our main processing pump.
        const pump = async () => {
          if (hasEncounteredError) {
            return; // Stop pumping if an error occurred.
          }

          // Backpressure check: Only proceed if the buffer isn't too full.
          if (sourceBuffer.updating) {
            // If the buffer is already busy, wait for it to finish its current operation.
            setTimeout(pump, 100);
            return;
          }

          if (sourceBuffer.buffered.length > 0) {
            const bufferedEnd = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
            const bufferAhead = bufferedEnd - audioElement.currentTime;
            if (bufferAhead > MAX_BUFFER_AHEAD) {
              // Buffer is full, so we pause and check again shortly.
              setTimeout(pump, 250); // Check again in 250ms
              return;
            }
          }

          // Read the next chunk from the network.
          try {
            const { done, value } = await reader.read();

            if (done) {
              ttsGenerating.set(false);

              const audioBlob = new Blob(allChunks, { type: "audio/mpeg" });
              const downloadUrl = URL.createObjectURL(audioBlob);
              onDownloadReady({ downloadUrl, filename: generateAudioFilename(text) });

              const finalizeMediaSource = () => {
                if (!sourceBuffer.updating) {
                  if (mediaSource.readyState === "open") {
                    mediaSource.endOfStream();
                  }
                } else {
                  setTimeout(finalizeMediaSource, 100);
                }
              };
              finalizeMediaSource();
              return;
            }

            // We have a chunk. Append it.
            allChunks.push(value);
            // The 'updateend' event will trigger the next pump cycle.
            sourceBuffer.addEventListener("updateend", pump, { once: true });
            sourceBuffer.appendBuffer(value);
          } catch (readError) {
            // This catches errors from reader.read() (e.g., network issues).
            handleError("Error reading audio stream.", readError);
          }
        };

        // Add a listener for appendBuffer errors, like QuotaExceeded.
        sourceBuffer.addEventListener("error", (ev) => {
          handleError("A media buffer error occurred. Playback may be incomplete.", ev);
        });

        // Start the pump for the first time.
        pump();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (setupError: any) {
        // This catches errors from the initial fetch() call.
        handleError(setupError.message, setupError);
      }
    },
    { once: true }
  );
}
