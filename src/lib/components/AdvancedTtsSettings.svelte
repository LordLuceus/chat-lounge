<script lang="ts">
  import Toast from "$lib/components/Toast.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import { ariaListOpen } from "$lib/helpers";
  import { selectedTtsModel, selectedVoice } from "$lib/stores";
  import type { TtsModelItem } from "$lib/types/client";
  import type { ElevenLabsModel } from "$lib/types/elevenlabs";
  import type { VoiceSettings } from "@elevenlabs/elevenlabs-js/api";
  import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
  import { onMount } from "svelte";
  import Select from "svelte-select";
  import { toast } from "svelte-sonner";
  import { derived } from "svelte/store";

  const client = useQueryClient();

  const defaultSettings: VoiceSettings = {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: false,
    speed: 1
  };

  // 1. Local Form State (Bound to UI inputs)
  let localStability: number = defaultSettings.stability!;
  let localSimilarityBoost: number = defaultSettings.similarityBoost!;
  let localStyle: number = defaultSettings.style!;
  let localSpeakerBoost: boolean = defaultSettings.useSpeakerBoost!;
  let localSpeed: number = defaultSettings.speed!;

  const voiceSettingsQuery = createQuery<VoiceSettings>(
    derived(selectedVoice, ($selectedVoice) => ({
      queryKey: ["voiceSettings", $selectedVoice?.value],
      queryFn: async () => {
        if (!$selectedVoice?.value) {
          return { ...defaultSettings }; // Return a copy
        }
        try {
          const response = await fetch(`/api/voices/${$selectedVoice.value}/settings`);
          if (!response.ok) {
            console.error("Failed to fetch voice settings:", response.statusText);
            toast.error(Toast, {
              componentProps: { text: "Failed to fetch voice settings. Using defaults." }
            });
            return { ...defaultSettings };
          }
          const data: VoiceSettings = await response.json();
          return {
            stability: data?.stability ?? defaultSettings.stability,
            similarityBoost: data?.similarityBoost ?? defaultSettings.similarityBoost,
            style: data?.style ?? defaultSettings.style,
            useSpeakerBoost: data?.useSpeakerBoost ?? defaultSettings.useSpeakerBoost,
            speed: data?.speed ?? defaultSettings.speed
          };
        } catch (error) {
          console.error("Error fetching voice settings:", error);
          toast.error(Toast, {
            componentProps: { text: "Error fetching voice settings. Using defaults." }
          });
          return { ...defaultSettings };
        }
      },
      initialData: { ...defaultSettings },
      refetchOnWindowFocus: true,
      enabled: !!$selectedVoice?.value // Only enable query when a voice is selected
    }))
  );

  const voiceSettingsMutation = createMutation({
    mutationFn: async (voiceId: string) => {
      const response = await fetch(`/api/voices/${voiceId}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          stability: localStability,
          similarityBoost: localSimilarityBoost,
          style: localStyle,
          useSpeakerBoost: localSpeakerBoost,
          speed: localSpeed
        } satisfies VoiceSettings)
      });

      if (!response.ok) {
        console.error("Failed to update voice settings:", response.statusText);
        toast.error(Toast, {
          componentProps: { text: `Failed to update voice settings: ${response.statusText}` }
        });
        throw new Error("Failed to update voice settings");
      }
      return (await response.json()) as VoiceSettings;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["voiceSettings", $selectedVoice?.value] });
      toast.success(Toast, { componentProps: { text: "Voice settings saved" } });
    },
    onError: (error) => {
      console.error("Error saving voice settings:", error);
    }
  });

  let models: TtsModelItem[] | undefined;

  function syncLocalStateWithQueryData(settings: VoiceSettings | undefined | null) {
    const data = settings ?? defaultSettings;
    localStability = data.stability ?? defaultSettings.stability!;
    localSimilarityBoost = data.similarityBoost ?? defaultSettings.similarityBoost!;
    localStyle = data.style ?? defaultSettings.style!;
    localSpeakerBoost = data.useSpeakerBoost ?? defaultSettings.useSpeakerBoost!;
    localSpeed = data.speed ?? defaultSettings.speed!;
  }

  $: if (
    $voiceSettingsQuery.data &&
    !$voiceSettingsQuery.isPlaceholderData &&
    $voiceSettingsQuery.status === "success"
  ) {
    syncLocalStateWithQueryData($voiceSettingsQuery.data);
  }

  $: if ($selectedVoice) {
    const currentData = client.getQueryData<VoiceSettings>(["voiceSettings", $selectedVoice.value]);
    if (!currentData || $voiceSettingsQuery.isPlaceholderData) {
      syncLocalStateWithQueryData(currentData ?? defaultSettings);
    }
  }

  async function fetchTtsModels() {
    try {
      const response = await fetch("/api/tts-models");
      if (!response.ok) {
        console.error("Failed to fetch TTS models:", response.statusText);
        toast.error(Toast, { componentProps: { text: "Failed to fetch TTS models" } });
        return [];
      }
      const fetchedModels: ElevenLabsModel[] = await response.json();
      return fetchedModels
        .filter((model) => model.can_do_text_to_speech)
        .map((model) => ({
          label: model.name,
          value: model.model_id,
          characterLimit: model.maximum_text_length_per_request
        }));
    } catch (error) {
      console.error("Error fetching TTS models:", error);
      toast.error(Toast, { componentProps: { text: "Error fetching TTS models" } });
      return [];
    }
  }

  onMount(async () => {
    models = await fetchTtsModels();
    if ($voiceSettingsQuery.data && !$voiceSettingsQuery.isPlaceholderData) {
      syncLocalStateWithQueryData($voiceSettingsQuery.data);
    }
  });

  function handleSettingsChange() {
    if (!$selectedVoice?.value) {
      toast.warning(Toast, { componentProps: { text: "Please select a voice first" } });
      return;
    }
    $voiceSettingsMutation.mutate($selectedVoice.value);
  }

  function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  function formatSpeed(value: number): string {
    const numValue = Number(value);
    return isNaN(numValue) ? "N/A" : `${numValue.toFixed(2)}x`;
  }
</script>

<Dialog.Root>
  <Dialog.Trigger asChild let:builder>
    <Button builders={[builder]} variant="outline">Advanced TTS Settings</Button>
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>Advanced TTS Settings</Dialog.Title>
      <Dialog.Description>
        Adjust model and voice settings. Changes apply to the selected voice.
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="tts-model" class="col-span-1 text-right">Model</Label>
        <div class="col-span-3">
          <Select
            id="tts-model"
            bind:value={$selectedTtsModel}
            items={models ?? []}
            placeholder="Select model..."
            {ariaListOpen}
            clearable={false}
            class="w-full"
          />
        </div>
      </div>

      {#if $selectedVoice}
        <h3 class="mt-2 border-t pt-4 text-lg font-semibold">
          Voice Settings for {$selectedVoice.label}
        </h3>

        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="speed" class="text-right">Speed</Label>
          <input
            id="speed"
            type="range"
            class="col-span-2 h-2 cursor-pointer appearance-none rounded-lg bg-primary accent-primary"
            min={0.7}
            max={1.2}
            step={0.01}
            bind:value={localSpeed}
            aria-label="Speed"
          />
          <span class="w-[40px] text-right text-sm text-muted-foreground"
            >{formatSpeed(localSpeed)}</span
          >
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="stability" class="text-right">Stability</Label>
          <input
            id="stability"
            type="range"
            class="col-span-2 h-2 cursor-pointer appearance-none rounded-lg bg-primary accent-primary"
            min={0}
            max={1}
            step={0.01}
            bind:value={localStability}
            aria-label="Stability"
          />
          <span class="w-[40px] text-right text-sm text-muted-foreground"
            >{formatPercent(localStability)}</span
          >
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="similarity" class="text-right">Similarity</Label>
          <input
            id="similarity"
            type="range"
            class="col-span-2 h-2 cursor-pointer appearance-none rounded-lg bg-primary accent-primary"
            min={0}
            max={1}
            step={0.01}
            bind:value={localSimilarityBoost}
            aria-label="Similarity Boost"
          />
          <span class="w-[40px] text-right text-sm text-muted-foreground"
            >{formatPercent(localSimilarityBoost)}</span
          >
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="style" class="text-right">Style</Label>
          <input
            id="style"
            type="range"
            class="col-span-2 h-2 cursor-pointer appearance-none rounded-lg bg-primary accent-primary"
            min={0}
            max={1}
            step={0.01}
            bind:value={localStyle}
            aria-label="Style Exaggeration"
          />
          <span class="w-[40px] text-right text-sm text-muted-foreground"
            >{formatPercent(localStyle)}</span
          >
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="speaker-boost" class="text-right">Speaker Boost</Label>
          <div class="col-span-3 flex items-center">
            <Switch id="speaker-boost" bind:checked={localSpeakerBoost} />
          </div>
        </div>
      {:else}
        <p class="col-span-full py-4 text-center text-muted-foreground">
          Select a voice to adjust its settings.
        </p>
      {/if}
    </div>
    <Dialog.Footer>
      {#if $selectedVoice}
        <Button on:click={handleSettingsChange} disabled={$voiceSettingsMutation.isPending}>
          {#if $voiceSettingsMutation.isPending}Saving...{:else}Save Changes{/if}
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
