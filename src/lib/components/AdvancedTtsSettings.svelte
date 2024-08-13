<script lang="ts">
  import Toast from "$lib/components/Toast.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { ariaListOpen } from "$lib/helpers";
  import { selectedTtsModel } from "$lib/stores";
  import type { TtsModelItem } from "$lib/types/client";
  import type { ElevenLabsModel } from "$lib/types/elevenlabs";
  import { onMount } from "svelte";
  import Select from "svelte-select";
  import { toast } from "svelte-sonner";

  let models: TtsModelItem[] | undefined;

  async function fetchTtsModels() {
    const response = await fetch("/api/tts-models");
    if (!response.ok) {
      toast.error(Toast, { componentProps: { text: "Failed to fetch TTS models" } });
      return [];
    }

    const models: ElevenLabsModel[] = await response.json();
    return models
      .filter((model) => model.can_do_text_to_speech)
      .map((model) => ({
        label: model.name,
        value: model.model_id,
        characterLimit: model.maximum_text_length_per_request
      }));
  }

  onMount(async () => {
    models = await fetchTtsModels();
  });
</script>

<Dialog.Root>
  <Dialog.Trigger>Advanced TTS Settings</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Advanced TTS Settings</Dialog.Title>
    </Dialog.Header>
    <Select
      bind:value={$selectedTtsModel}
      items={models}
      placeholder="Select model..."
      {ariaListOpen}
      clearable={false}
    />
  </Dialog.Content>
</Dialog.Root>
