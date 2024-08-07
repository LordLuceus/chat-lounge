<script lang="ts">
  import Toast from "$lib/components/Toast.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { generateAudioFilename } from "$lib/helpers/filename";
  import { audioFilename, currentAudioUrl, downloadUrl } from "$lib/stores";
  import type { HistoryResponse } from "$lib/types/elevenlabs/history";
  import { createInfiniteQuery, createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { Loader } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import Time from "svelte-time";

  let deleteDialogOpen = false;
  let deleteId: string | null;

  const client = useQueryClient();

  const historyQuery = createInfiniteQuery<HistoryResponse>({
    queryKey: ["ttsHistory"],
    queryFn: async ({ pageParam }) =>
      (await fetch(`/api/tts-history?lastItemId=${pageParam}`)).json(),
    initialPageParam: "",
    getNextPageParam: (lastPage: HistoryResponse) => {
      if (!lastPage.has_more) {
        return undefined;
      }
      return lastPage.last_history_item_id;
    }
  });

  const deleteHistoryItemMutation = createMutation({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/tts-history/${id}`, {
          method: "DELETE"
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["ttsHistory"] });
    }
  });

  async function handlePlay(id: string, text: string) {
    const response = await fetch(`/api/tts-history/${id}`);

    if (!response.ok) {
      toast.error(Toast, { componentProps: { text: "Failed to play audio" } });
    }

    const audio = await response.blob();

    currentAudioUrl.set(URL.createObjectURL(audio));

    downloadUrl.set(URL.createObjectURL(audio));
    audioFilename.set(generateAudioFilename(text));
  }

  async function handleDownload(id: string, text: string) {
    const response = await fetch(`/api/tts-history/${id}`);

    if (!response.ok) {
      toast.error(Toast, { componentProps: { text: "Failed to download audio" } });
    }

    const audio = await response.blob();

    const link = document.createElement("a");
    link.href = URL.createObjectURL(audio);
    link.download = generateAudioFilename(text);

    const clickHandler = () => {
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        removeEventListener("click", clickHandler);
      }, 150);
    };

    link.addEventListener("click", clickHandler, false);
    link.click();
  }

  function handleDelete() {
    if (!deleteId) {
      return;
    }

    $deleteHistoryItemMutation.mutate(deleteId, {
      onSuccess: () => {
        deleteDialogOpen = false;
        deleteId = null;
        toast.success(Toast, { componentProps: { text: "History item deleted." } });
      }
    });
  }
</script>

<svelte:head>
  <title>TTS History | ChatLounge</title>
  <meta name="description" content="View and manage your ChatLounge TTS history" />
</svelte:head>

<h1>TTS History</h1>

{#if $historyQuery.isSuccess}
  <ul class="list-none">
    {#each $historyQuery.data.pages as page}
      {#each page.history as historyItem}
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
              <Button on:click={() => handlePlay(historyItem.history_item_id, historyItem.text)}
                >Play</Button
              >
              <Button
                on:click={() => handleDownload(historyItem.history_item_id, historyItem.text)}
              >
                Download</Button
              >
              <Button
                on:click={() => {
                  deleteDialogOpen = true;
                  deleteId = historyItem.history_item_id;
                }}>Delete</Button
              >
            </Card.Footer>
          </Card.Root>
        </li>
      {/each}
    {/each}
  </ul>

  {#if $historyQuery.hasNextPage && !$historyQuery.isFetching}
    <Button
      disabled={!$historyQuery.hasNextPage || $historyQuery.isFetchingNextPage}
      on:click={() => $historyQuery.fetchNextPage()}>Load more</Button
    >
  {/if}
{:else if $historyQuery.isLoading}
  <Loader />
{:else if $historyQuery.isError}
  <p>Error: {$historyQuery.error.message}</p>
  <Button on:click={() => $historyQuery.refetch()}>Try again</Button>
{/if}

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete history item</AlertDialog.Title>
      <AlertDialog.Description>Are you sure you want to delete this item?</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel
        on:click={() => {
          deleteDialogOpen = false;
          deleteId = null;
        }}>Cancel</AlertDialog.Cancel
      >
      <AlertDialog.Action on:click={() => handleDelete()}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
