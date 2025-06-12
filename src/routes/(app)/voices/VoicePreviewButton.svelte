<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { playingAudio } from "$lib/stores";

  interface Props {
    name: string;
    previewUrl: string | null;
  }

  let { name, previewUrl }: Props = $props();

  function previewVoice() {
    playingAudio.update((currentAudio) => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      return null;
    });

    const audio = new Audio(previewUrl!);
    audio.play();
    playingAudio.set(audio);
  }
</script>

{#if previewUrl}
  <Button on:click={previewVoice}>{name}</Button>
{:else}
  <span>{name}</span>
{/if}
