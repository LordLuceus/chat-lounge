<script lang="ts">
  import { browser } from "$app/environment";
  import { Button } from "$lib/components/ui/button";
  import { Mic } from "@lucide/svelte";
  import { onDestroy, onMount } from "svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    setVoiceMessage: (message: string) => void;
  }

  const { setVoiceMessage }: Props = $props();

  let mediaRecorder: MediaRecorder;
  let recordedChunks: BlobPart[] = [];
  let recStartSound: HTMLAudioElement;
  let recStopSound: HTMLAudioElement;

  onMount(() => {
    recStartSound = new Audio("/assets/rec_start.flac");
    recStopSound = new Audio("/assets/rec_stop.flac");
  });

  onDestroy(() => {
    if (browser) {
      recStartSound.remove();
      recStopSound.remove();
    }
  });

  async function startRecording(): Promise<void> {
    const constraints: MediaStreamConstraints = {
      audio: {
        autoGainControl: false,
        noiseSuppression: false,
        echoCancellation: false
      }
    };

    const options = { mimeType: "audio/webm" } satisfies MediaRecorderOptions;

    recStartSound.play();

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorder.ondataavailable = (e): void => {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };
      mediaRecorder.start();
    } catch (e) {
      console.error(e);
      isRecording = false;
      toast.warning("Failed to start recording. Please check your microphone permissions.");
    }
  }

  function stopRecording(): void {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    recStopSound.play();
    mediaRecorder.onstop = (): void => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      createTranscript(blob);
    };
    recordedChunks = [];
  }

  let isRecording = $state(false);

  function toggleRecording(): void {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
    isRecording = !isRecording;
  }

  async function createTranscript(audio: Blob) {
    const formData = new FormData();
    formData.append("audio", audio, "audio.webm");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = await response.text();
        setVoiceMessage(data.trim());
      } else {
        console.error("Failed to transcribe audio");
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleRecordToggle(e: KeyboardEvent): void {
    if (e.ctrlKey && e.shiftKey && e.key === "S") {
      e.preventDefault();
      toggleRecording();
    }
  }
</script>

<svelte:window onkeydown={handleRecordToggle} />

<Button onclick={toggleRecording} aria-label={isRecording ? "Stop recording" : "Start recording"}>
  <Mic />
</Button>
