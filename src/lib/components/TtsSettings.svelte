<script lang="ts">
  import AdvancedTtsSettings from "$lib/components/AdvancedTtsSettings.svelte";
  import { ariaListOpen } from "$lib/helpers";
  import { selectedVoice, voices } from "$lib/stores";
  import Select from "svelte-select";

  $: voiceItems = $voices?.map((voice) => ({
    label: `${voice.name} (${voice.category})`,
    value: voice.voice_id
  }));

  function handleVoiceSelection() {
    if (!$selectedVoice) {
      $selectedVoice = voiceItems?.at(0);
    } else {
      if (!$voices?.find((voice) => voice.voice_id === $selectedVoice?.value)) {
        $selectedVoice = voiceItems?.at(0);
      }
    }
  }

  $: if ($voices) {
    handleVoiceSelection();
  }
</script>

<Select
  bind:value={$selectedVoice}
  items={voiceItems}
  placeholder="Select voice..."
  {ariaListOpen}
  clearable={false}
/>
<AdvancedTtsSettings />
