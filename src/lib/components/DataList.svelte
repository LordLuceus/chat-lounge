<script lang="ts">
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Label } from "$lib/components/ui/label";
  import { ToggleGroup, ToggleGroupItem } from "$lib/components/ui/toggle-group";
  import { type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import { Loader } from "@lucide/svelte";
  import type { CreateInfiniteQueryResult, InfiniteData } from "@tanstack/svelte-query";
  import { onMount } from "svelte";
  import Search from "svelte-search";
  import type { Writable } from "svelte/store";
  import { get } from "svelte/store";

  interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: CreateInfiniteQueryResult<InfiniteData<PagedResponse<any>, unknown>, Error>;
    searchLabel: string;
    searchParams: Writable<SearchParams>;
    sortOptions?: { label: string; value: string }[];
    defaultSortBy?: string;
    defaultSortOrder?: string;
    noResults?: import("svelte").Snippet;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children?: import("svelte").Snippet<[any]>;
    selectionMode?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (selectedIds: Set<string>) => void;
  }

  const {
    query,
    searchLabel,
    searchParams,
    sortOptions = [],
    defaultSortBy = "",
    defaultSortOrder = "",
    noResults,
    children,
    selectionMode = false,
    selectedIds = new Set(),
    onSelectionChange
  }: Props = $props();

  let value = $state("");
  let selectedSortBy: string = $state(defaultSortBy);
  let selectedSortOrder: string = $state(defaultSortOrder);

  function setSearch(value: string) {
    searchParams.update((params) => ({ ...params, search: value }));
    srAlertMessage = "";
  }

  function setSort(sortBy: string, sortOrder: string) {
    searchParams.update((params) => ({ ...params, sortBy, sortOrder }));
  }

  let srAlertMessage = $state("");

  function setAlertMessage() {
    const total = query.data?.pages[0].meta.total;

    if (total === 0 || !total) {
      srAlertMessage = "No results found";
    } else {
      srAlertMessage = `${total} result${total > 1 ? "s" : ""} found`;
    }
  }

  $effect(() => {
    if (query.isSuccess && $searchParams.search) setAlertMessage();
  });

  onMount(() => {
    const initial = get(searchParams);
    selectedSortBy = initial.sortBy || defaultSortBy;
    selectedSortOrder = initial.sortOrder || defaultSortOrder;

    if ((defaultSortBy && !initial.sortBy) || (defaultSortOrder && !initial.sortOrder)) {
      setSort(selectedSortBy, selectedSortOrder);
    }
  });

  function toggleItemSelection(itemId: string) {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    onSelectionChange(newSelection);
  }

  function toggleSelectAll() {
    if (!onSelectionChange || !query.data) return;

    const allItems = query.data.pages.flatMap((page) => page.data);
    const allIds = allItems.map((item) => item.id);

    if (selectedIds.size === allIds.length && allIds.every((id) => selectedIds.has(id))) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allIds));
    }
  }

  const allItemsSelected = $derived(() => {
    if (!query.data) return false;
    const allItems = query.data.pages.flatMap((page) => page.data);
    const allIds = allItems.map((item) => item.id);
    return allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  });

  const someItemsSelected = $derived(() => {
    if (!query.data) return false;
    const allItems = query.data.pages.flatMap((page) => page.data);
    const allIds = allItems.map((item) => item.id);
    return allIds.some((id) => selectedIds.has(id)) && !allItemsSelected();
  });
</script>

<Search
  debounce={800}
  label={searchLabel}
  bind:value
  on:type={({ detail }) => setSearch(detail)}
  on:clear={() => setSearch("")}
/>

{#if value}
  <Button onclick={() => (value = "")}>Clear search</Button>
{/if}

{#if selectionMode}
  <div class="mb-4 flex items-center gap-2">
    <Checkbox
      checked={allItemsSelected()}
      indeterminate={someItemsSelected()}
      onCheckedChange={toggleSelectAll}
      id="select-all"
    />
    <Label for="select-all" class="text-sm">
      {allItemsSelected() ? "Deselect all" : someItemsSelected() ? "Select all" : "Select all"}
    </Label>
    {#if selectedIds.size > 0}
      <span class="ml-2 text-sm text-muted-foreground">
        {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
      </span>
    {/if}
  </div>
{/if}

{#if sortOptions.length}
  <div class="my-4 flex items-center gap-4">
    <Label class="flex items-center gap-2 font-medium">
      Sort by:
      <select
        bind:value={selectedSortBy}
        onchange={() => setSort(selectedSortBy, selectedSortOrder)}
        class="rounded border px-2 py-1"
      >
        {#each sortOptions as { label, value }}
          <option {value}>{label}</option>
        {/each}
      </select>
    </Label>
    <div class="flex items-center gap-2">
      <Label class="font-medium">Order:</Label>
      <ToggleGroup
        type="single"
        value={selectedSortOrder}
        aria-label="Sort order"
        onValueChange={(value) => {
          if (value !== undefined) {
            selectedSortOrder = value;
            setSort(selectedSortBy, selectedSortOrder);
          }
        }}
      >
        <ToggleGroupItem value="ASC">Ascending</ToggleGroupItem>
        <ToggleGroupItem value="DESC">Descending</ToggleGroupItem>
      </ToggleGroup>
    </div>
  </div>
{/if}

{#if query.isSuccess}
  {#if query.data.pages[0].meta.total === 0}
    {@render noResults?.()}
  {/if}

  <InfiniteScroll
    hasMore={query.hasNextPage}
    fetchMore={() => !query.isFetching && query.fetchNextPage()}
  >
    <ul class="list-none">
      {#each query.data.pages as { data }, index (index)}
        {#each data as item (item.id)}
          <li class="flex items-center {selectionMode ? 'gap-3' : ''}">
            {#if selectionMode}
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={() => toggleItemSelection(item.id)}
                id={`item-${item.id}`}
              />
            {/if}
            <div class="flex-1">
              {@render children?.({ item })}
            </div>
          </li>
        {/each}
      {/each}
    </ul>
  </InfiniteScroll>
{/if}

{#if query.isFetching}
  <Loader class="animate-spin" />
{/if}

{#if query.isError}
  <p>Error: {query.error.message}</p>
{/if}

{#if srAlertMessage && $searchParams.search}
  <div class="sr-only" role="alert">
    <p>{srAlertMessage}</p>
  </div>
{/if}
