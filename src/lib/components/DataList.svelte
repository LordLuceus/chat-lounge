<script lang="ts">
  import { run } from "svelte/legacy";

  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { ToggleGroup, ToggleGroupItem } from "$lib/components/ui/toggle-group";
  import { type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { CreateInfiniteQueryResult, InfiniteData } from "@tanstack/svelte-query";
  import { Loader } from "lucide-svelte";
  import { onMount } from "svelte";
  import Search from "svelte-search";
  import type { Writable } from "svelte/store";
  import { get } from "svelte/store";

  interface Props {
    query: CreateInfiniteQueryResult<InfiniteData<PagedResponse<any>, unknown>, Error>;
    searchLabel: string;
    searchParams: Writable<SearchParams>;
    sortOptions?: { label: string; value: string }[];
    defaultSortBy?: string;
    defaultSortOrder?: string;
    noResults?: import("svelte").Snippet;
    children?: import("svelte").Snippet<[any]>;
  }

  let {
    query,
    searchLabel,
    searchParams,
    sortOptions = [],
    defaultSortBy = "",
    defaultSortOrder = "",
    noResults,
    children
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
    const total = $query.data?.pages[0].meta.total;

    if (total === 0 || !total) {
      srAlertMessage = "No results found";
    } else {
      srAlertMessage = `${total} result${total > 1 ? "s" : ""} found`;
    }
  }

  run(() => {
    if ($query.isSuccess && $searchParams.search) setAlertMessage();
  });

  onMount(() => {
    const initial = get(searchParams);
    selectedSortBy = initial.sortBy || defaultSortBy;
    selectedSortOrder = initial.sortOrder || defaultSortOrder;

    if ((defaultSortBy && !initial.sortBy) || (defaultSortOrder && !initial.sortOrder)) {
      setSort(selectedSortBy, selectedSortOrder);
    }
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
  <Button on:click={() => (value = "")}>Clear search</Button>
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

{#if $query.isSuccess}
  {#if $query.data.pages[0].meta.total === 0}
    {@render noResults?.()}
  {/if}

  <InfiniteScroll
    hasMore={$query.hasNextPage}
    fetchMore={() => !$query.isFetching && $query.fetchNextPage()}
  >
    <ul class="list-none">
      {#each $query.data.pages as { data }}
        {#each data as item}
          <li class="flex items-center">
            {@render children?.({ item })}
          </li>
        {/each}
      {/each}
    </ul>
  </InfiniteScroll>
{/if}

{#if $query.isFetching}
  <Loader />
{/if}

{#if $query.isError}
  <p>Error: {$query.error.message}</p>
{/if}

{#if srAlertMessage && $searchParams.search}
  <div class="sr-only" role="alert">
    <p>{srAlertMessage}</p>
  </div>
{/if}
