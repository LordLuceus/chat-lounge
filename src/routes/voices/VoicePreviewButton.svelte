<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { playingAudio } from "$lib/stores/audio-store";

  export let name: string;
  export let previewUrl: string;

  function previewVoice() {
    playingAudio.update((currentAudio) => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      return null;
    });
    const audio = new Audio(previewUrl);
    audio.play();
    playingAudio.set(audio);
  }
</script>

<Button on:click={previewVoice}>{name}</Button>
