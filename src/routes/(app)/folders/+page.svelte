<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import BulkActions from "$lib/components/BulkActions.svelte";
  import CreateFolderDialog from "$lib/components/CreateFolderDialog.svelte";
  import DataList from "$lib/components/DataList.svelte";
  import FolderActions from "$lib/components/FolderActions.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { searchParams, type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { Folder } from "@prisma/client";
  import { createInfiniteQuery } from "@tanstack/svelte-query";
  import { onDestroy } from "svelte";
  import { SignedIn } from "svelte-clerk";
  import Time from "svelte-time";

  const fetchFolders = async (
    { pageParam = 1 },
    { search, sortBy, sortOrder, folderId }: SearchParams
  ) => {
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
    if (folderId) {
      url.searchParams.set("folderId", folderId);
    }

    return fetch(url.toString()).then((res) => res.json());
  };

  const foldersQuery = createInfiniteQuery<PagedResponse<Folder>>(() => {
    return {
      queryKey: ["folders", $searchParams],
      queryFn: ({ pageParam }: { pageParam: unknown }) =>
        fetchFolders({ pageParam: pageParam as number }, $searchParams),
      initialPageParam: 1,
      getNextPageParam: (lastPage: PagedResponse<Folder>) => {
        if (lastPage.meta.page < lastPage.meta.totalPages) {
          return lastPage.meta.page + 1;
        }
        return undefined;
      }
    };
  });

  onDestroy(() => {
    if (browser)
      searchParams.set({
        search: "",
        sortBy: "",
        sortOrder: "",
        ownerOnly: false,
        visibility: "",
        folderId: undefined
      });
  });

  const folderSortOptions = [
    { label: "Name", value: "name" },
    { label: "Created", value: "createdAt" },
    { label: "Updated", value: "updatedAt" }
  ];

  let selectionMode = $state(false);
  let selectedFolders = $state(new Set<string>());

  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    selectedFolders = new Set();
  }

  function handleSelectionChange(newSelection: Set<string>) {
    selectedFolders = newSelection;
  }

  function clearSelection() {
    selectedFolders = new Set();
    selectionMode = false;
  }

  const selectedFolderItems = $derived(() => {
    if (!foldersQuery.data) return [];
    const allItems = foldersQuery.data.pages.flatMap((page) => page.data);
    return allItems.filter((item) => selectedFolders.has(item.id));
  });
</script>

<svelte:head>
  <title>Folders | ChatLounge</title>
</svelte:head>

<div class="mb-4 flex items-center justify-between">
  <h1>Folders</h1>
  <div class="flex gap-2">
    <CreateFolderDialog />

    <Button variant="outline" onclick={toggleSelectionMode}>
      {selectionMode ? "Exit Selection" : "Select Multiple"}
    </Button>
  </div>
</div>

<BulkActions
  selectedIds={selectedFolders}
  selectedItems={selectedFolderItems()}
  resourceType="folders"
  onClearSelection={clearSelection}
/>

<SignedIn>
  <DataList
    query={foldersQuery}
    searchLabel="Search folders"
    {searchParams}
    sortOptions={folderSortOptions}
    defaultSortBy="updatedAt"
    defaultSortOrder="DESC"
    {selectionMode}
    selectedIds={selectedFolders}
    onSelectionChange={handleSelectionChange}
  >
    {#snippet noResults()}
      <p>No folders found.</p>
    {/snippet}
    {#snippet children({ item })}
      <Card.Root>
        <Card.Header>
          <Card.Title level={2}>
            <a href={`/folders/${item.id}`}>{item.name}</a>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <p>
            <strong>Last updated </strong>
            <Time timestamp={item.updatedAt} relative />
          </p>
        </Card.Content>
        <Card.Footer>
          <FolderActions id={item.id} name={item.name} />
        </Card.Footer>
      </Card.Root>
    {/snippet}
  </DataList>
</SignedIn>
