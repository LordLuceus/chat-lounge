<script lang="ts">
  import { browser } from "$app/environment";
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import BulkActions from "$lib/components/BulkActions.svelte";
  import ConversationActions from "$lib/components/ConversationActions.svelte";
  import DataList from "$lib/components/DataList.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { searchParams, type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { Conversation } from "@prisma/client";
  import { createInfiniteQuery } from "@tanstack/svelte-query";
  import { onDestroy, onMount } from "svelte";
  import Time from "svelte-time";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  const fetchConversations = async (
    { pageParam = 1 },
    { search, sortBy, sortOrder, folderId }: SearchParams
  ) => {
    const url = new URL("/api/conversations", page.url.origin);

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

    return await fetch(url.toString()).then((res) => res.json());
  };

  const conversationsQuery = $derived(
    createInfiniteQuery<PagedResponse<Conversation>>(() => {
      return {
        queryKey: ["conversations", $searchParams],
        queryFn: ({ pageParam }: { pageParam: unknown }) =>
          fetchConversations({ pageParam: pageParam as number }, $searchParams),
        initialPageParam: 1,
        getNextPageParam: (lastPage: PagedResponse<Conversation>) => {
          if (lastPage.meta.page < lastPage.meta.totalPages) {
            return lastPage.meta.page + 1;
          }
          return undefined;
        }
      };
    })
  );

  onDestroy(() => {
    if (browser) searchParams.set({ search: "", sortBy: "", sortOrder: "", folderId: undefined });
  });

  const conversationSortOptions = [
    { label: "Name", value: "name" },
    { label: "Created", value: "createdAt" },
    { label: "Updated", value: "lastUpdated" }
  ];

  let selectionMode = $state(false);
  let selectedConversations = $state(new Set<string>());

  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    selectedConversations = new Set();
  }

  function handleSelectionChange(newSelection: Set<string>) {
    selectedConversations = newSelection;
  }

  function clearSelection() {
    selectedConversations = new Set();
    selectionMode = false;
  }

  const selectedConversationItems = $derived(() => {
    if (!conversationsQuery.data) return [];
    const allItems = conversationsQuery.data.pages.flatMap((page) => page.data);
    return allItems.filter((item) => selectedConversations.has(item.id));
  });

  function setFolderId() {
    if (browser) {
      const folderId = data.folder?.id;
      if (folderId) {
        searchParams.set({ ...$searchParams, folderId });
      }
    }
  }

  onMount(() => {
    setFolderId();
  });

  afterNavigate(() => {
    setFolderId();
  });
</script>

<svelte:head>
  <title>{data.folder?.name} | ChatLounge</title>
  <meta name="description" content={data.folder?.name} />
</svelte:head>

<div class="mb-4 flex items-center justify-between">
  <h1>{data.folder?.name}</h1>
  <Button variant="outline" onclick={toggleSelectionMode}>
    {selectionMode ? "Exit Selection" : "Select Multiple"}
  </Button>
</div>

<BulkActions
  selectedIds={selectedConversations}
  selectedItems={selectedConversationItems()}
  resourceType="conversations"
  onClearSelection={clearSelection}
/>

<DataList
  query={conversationsQuery}
  searchLabel="Search conversations in folder"
  {searchParams}
  sortOptions={conversationSortOptions}
  defaultSortBy="lastUpdated"
  defaultSortOrder="DESC"
  {selectionMode}
  selectedIds={selectedConversations}
  onSelectionChange={handleSelectionChange}
>
  {#snippet noResults()}
    <p>No conversations found.</p>
  {/snippet}
  {#snippet children({ item })}
    <Card.Root>
      <Card.Header>
        <Card.Title level={2}>
          <a href={`${item.agentId ? "/agents/" + item.agentId : ""}/conversations/${item.id}`}
            >{item.name}</a
          >
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <p>
          <strong>Last updated </strong>
          <Time timestamp={item.lastUpdated} relative />
        </p>
      </Card.Content>
      <Card.Footer>
        <ConversationActions
          id={item.id}
          name={item.name}
          sharedConversationId={item.sharedConversationId}
          isPinned={item.isPinned}
          folderId={item.folderId}
        />
      </Card.Footer>
    </Card.Root>
  {/snippet}
</DataList>
