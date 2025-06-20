<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { voices } from "$lib/stores";
  import { Loader } from "@lucide/svelte";
  import VoiceActions from "./VoiceActions.svelte";
  import VoicePreviewButton from "./VoicePreviewButton.svelte";
</script>

<svelte:head>
  <title>Voices | ChatLounge</title>
  <meta name="description" content="View and manage your ChatLounge voices" />
</svelte:head>

<h1>Voices</h1>
{#if $voices}
  <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {#each $voices as voice (voice.voice_id)}
      <Card.Root>
        <Card.Header class="pb-2">
          <div class="flex items-center justify-between">
            <Card.Title class="text-lg">
              <VoicePreviewButton name={voice.name} previewUrl={voice.preview_url} />
            </Card.Title>
          </div>
        </Card.Header>
        <Card.Content>
          <Card.Description class="capitalize">{voice.category}</Card.Description>
        </Card.Content>
        <Card.Footer>
          <div class="flex items-center justify-between">
            <VoiceActions id={voice.voice_id} category={voice.category} />
          </div>
        </Card.Footer>
      </Card.Root>
    {/each}
  </div>
{:else}
  <div class="flex items-center justify-center py-8">
    <Loader class="animate-spin" />
  </div>
{/if}
