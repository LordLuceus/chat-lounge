<script lang="ts">
  import { run } from "svelte/legacy";

  import AdvancedTtsSettings from "$lib/components/AdvancedTtsSettings.svelte";
  import { ariaListOpen } from "$lib/helpers";
  import { selectedVoice, voices } from "$lib/stores";
  import Select from "svelte-select";

  let voiceItems = $derived(
    $voices?.map((voice) => ({
      label: `${voice.name} (${voice.category})`,
      value: voice.voice_id
    }))
  );

  function handleVoiceSelection() {
    if (!$selectedVoice) {
      $selectedVoice = voiceItems?.at(0);
    } else {
      if (!$voices?.find((voice) => voice.voice_id === $selectedVoice?.value)) {
        $selectedVoice = voiceItems?.at(0);
      }
    }
  }

  run(() => {
    if ($voices) {
      handleVoiceSelection();
    }
  });
</script>

<Select
  bind:value={$selectedVoice}
  items={voiceItems}
  placeholder="Select voice..."
  {ariaListOpen}
  clearable={false}
/>
<AdvancedTtsSettings />
