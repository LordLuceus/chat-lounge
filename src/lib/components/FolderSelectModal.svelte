<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import DataList from "$lib/components/DataList.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import type { SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { Folder } from "@prisma/client";
  import { createInfiniteQuery } from "@tanstack/svelte-query";
  import { onDestroy } from "svelte";
  import { writable } from "svelte/store";

  interface Props {
    open: boolean;
    title?: string;
    description?: string;
    onFolderSelect: (folder: Folder) => void;
    onOpenChange?: (open: boolean) => void;
  }

  const {
    open = $bindable(),
    title = "Select Folder",
    description = "Choose a folder",
    onFolderSelect,
    onOpenChange
  }: Props = $props();

  const searchParams = writable<SearchParams>({
    search: "",
    sortBy: "",
    sortOrder: ""
  });

  const fetchFolders = async ({ pageParam = 1 }, { search, sortBy, sortOrder }: SearchParams) => {
    const url = new URL("/api/folders", page.url.origin);

    url.searchParams.set("page", pageParam.toString());
    if (search) {
      url.searchParams.set("search", search);
    }
    if (sortBy) {
      url.searchParams.set("sortBy", sortBy);
    }
    if (sortOrder) {
      url.searchParams.set("sortOrder", sortOrder);
    }

    return fetch(url.toString()).then((res) => res.json());
  };

  const foldersQuery = $derived(
    createInfiniteQuery<PagedResponse<Folder>>(() => {
      return {
        queryKey: ["folders-modal", $searchParams],
        queryFn: ({ pageParam }: { pageParam: unknown }) =>
          fetchFolders({ pageParam: pageParam as number }, $searchParams),
        initialPageParam: 1,
        getNextPageParam: (lastPage: PagedResponse<Folder>) => {
          if (lastPage.meta.page < lastPage.meta.totalPages) {
            return lastPage.meta.page + 1;
          }
          return undefined;
        },
        enabled: open
      };
    })
  );

  onDestroy(() => {
    if (browser)
      searchParams.set({
        search: "",
        sortBy: "",
        sortOrder: ""
      });
  });

  function handleFolderClick(folder: Folder) {
    onFolderSelect(folder);
  }

  function handleOpenChange(newOpen: boolean) {
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>{description}</Dialog.Description>
      <DataList query={foldersQuery} searchLabel="Search folders" {searchParams}>
        {#snippet noResults()}
          <p>No folders found.</p>
        {/snippet}
        {#snippet children({ item })}
          <div>
            <Button
              variant="outline"
              class="w-full justify-start"
              onclick={() => handleFolderClick(item)}
            >
              {item.name}
            </Button>
          </div>
        {/snippet}
      </DataList>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
