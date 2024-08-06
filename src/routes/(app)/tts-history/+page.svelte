<script lang="ts">
  import Toast from "$lib/components/Toast.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { audioFilename, currentAudioUrl, downloadUrl } from "$lib/stores";
  import type { HistoryResponse } from "$lib/types/elevenlabs/history";
  import { createQuery } from "@tanstack/svelte-query";
  import { Loader } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import Time from "svelte-time";

  const historyQuery = createQuery<HistoryResponse>({
    queryKey: ["ttsHistory"],
    queryFn: async () => (await fetch("/api/tts-history")).json(),
    refetchInterval: 60000
  });

  async function handlePlay(id: string, fileName: string) {
    const response = await fetch(`/api/tts-history/${id}`);

    if (!response.ok) {
      toast.error(Toast, { componentProps: { text: "Failed to play audio" } });
    }

    const audio = await response.blob();

    currentAudioUrl.set(URL.createObjectURL(audio));

    downloadUrl.set(URL.createObjectURL(audio));
    audioFilename.set(fileName);
  }

  async function handleDownload(id: string, fileName: string) {
    const response = await fetch(`/api/tts-history/${id}`);

    if (!response.ok) {
      toast.error(Toast, { componentProps: { text: "Failed to download audio" } });
    }

    const audio = await response.blob();

    const link = document.createElement("a");
    link.href = URL.createObjectURL(audio);
    link.download = fileName;

    const clickHandler = () => {
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        removeEventListener("click", clickHandler);
      }, 150);
    };

    link.addEventListener("click", clickHandler, false);
    link.click();
  }
</script>

<svelte:head>
  <title>TTS History | ChatLounge</title>
  <meta name="description" content="View and manage your ChatLounge TTS history" />
</svelte:head>

<h1>TTS History</h1>

{#if $historyQuery.isSuccess}
  <ul class="list-none">
    {#each $historyQuery.data.history as historyItem}
      <li>
        <Card.Root>
          <Card.Header>
            <Card.Title tag="h2">{historyItem.text.slice(0, 80)}...</Card.Title>
          </Card.Header>
          <Card.Content>
            <p>{historyItem.voice_name}</p>
            <p><Time timestamp={historyItem.date_unix * 1000} relative /></p>
          </Card.Content>
          <Card.Footer>
            <Button
              on:click={() =>
                handlePlay(historyItem.history_item_id, historyItem.text.slice(0, 80))}>Play</Button
            >
            <Button
              on:click={() =>
                handleDownload(historyItem.history_item_id, historyItem.text.slice(0, 80))}
            >
              Download</Button
            >
          </Card.Footer>
        </Card.Root>
      </li>
    {/each}
  </ul>
{:else if $historyQuery.isLoading}
  <Loader />
{:else if $historyQuery.isError}
  <p>Error: {$historyQuery.error.message}</p>
  <Button on:click={() => $historyQuery.refetch()}>Try again</Button>
{/if}
