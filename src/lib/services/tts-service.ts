import { generateAudioFilename } from "$lib/filename";
import { ttsGenerating } from "$lib/stores/tts-generating-store";

interface TTSOptions {
  text: string;
  userId?: string;
  voice?: string;
  onPlayAudio: (audioUrl: string | null) => void;
  onDownloadAudio: (downloadOptions: { downloadUrl: string; filename: string }) => void;
  onError: (error: string) => void;
}

export async function generateTTS({
  text,
  userId,
  voice,
  onPlayAudio,
  onDownloadAudio,
  onError
}: TTSOptions): Promise<void> {
  let streamSupported = true;

  if (!window.MediaSource) {
    console.error("MediaSource API is not supported in this browser");
    streamSupported = false;
  }

  if (!MediaSource.isTypeSupported("audio/mpeg")) {
    streamSupported = false;
  }

  ttsGenerating.set(true);

  if (!streamSupported) {
    const response = await fetch(`/api/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text, userId, voice, stream: false })
    });

    if (!response.ok) {
      ttsGenerating.set(false);
      onPlayAudio(null);
      const error = await response.json();
      onError(error.message);
      return;
    }

    const audioBlob = await response.blob();
    const downloadUrl = URL.createObjectURL(audioBlob);
    onPlayAudio(downloadUrl);
    onDownloadAudio({ downloadUrl, filename: generateAudioFilename(text) });
    ttsGenerating.set(false);
    return;
  }

  const mediaSource = new MediaSource();
  const audioUrl = URL.createObjectURL(mediaSource);
  const chunks: Uint8Array[] = [];

  onPlayAudio(audioUrl);

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
            userId,
            voice,
            stream: true
          })
        });

        if (!response.ok) {
          mediaSource.endOfStream("network");

          onPlayAudio(null);

          const error = await response.json();
          onError(error.message);
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
            onDownloadAudio({ downloadUrl, filename: generateAudioFilename(text) });
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
}
