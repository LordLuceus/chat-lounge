<script lang="ts">
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import { Button } from "$lib/components/ui/button";
  import { ToggleGroup, ToggleGroupItem } from "$lib/components/ui/toggle-group";
  import { type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { CreateInfiniteQueryResult, InfiniteData } from "@tanstack/svelte-query";
  import { Loader } from "lucide-svelte";
  import { onMount } from "svelte";
  import Search from "svelte-search";
  import type { Writable } from "svelte/store";
  import { get } from "svelte/store";

  export let query: CreateInfiniteQueryResult<InfiniteData<PagedResponse<any>, unknown>, Error>;
  export let searchLabel: string;
  export let searchParams: Writable<SearchParams>;
  export let sortOptions: { label: string; value: string }[] = [];
  export let defaultSortBy: string = "";
  export let defaultSortOrder: string = "";

  let value = "";
  let selectedSortBy: string = defaultSortBy;
  let selectedSortOrder: string = defaultSortOrder;

  function setSearch(value: string) {
    searchParams.update((params) => ({ ...params, search: value }));
    srAlertMessage = "";
  }

  function setSort(sortBy: string, sortOrder: string) {
    searchParams.update((params) => ({ ...params, sortBy, sortOrder }));
  }

  let srAlertMessage = "";

  function setAlertMessage() {
    const total = $query.data?.pages[0].meta.total;

    if (total === 0 || !total) {
      srAlertMessage = "No results found";
    } else {
      srAlertMessage = `${total} result${total > 1 ? "s" : ""} found`;
    }
  }

  $: if ($query.isSuccess && $searchParams.search) setAlertMessage();

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
    <label class="flex items-center gap-2 font-medium">
      Sort by:
      <select
        bind:value={selectedSortBy}
        on:change={() => setSort(selectedSortBy, selectedSortOrder)}
        class="rounded border px-2 py-1"
      >
        {#each sortOptions as { label, value }}
          <option {value}>{label}</option>
        {/each}
      </select>
    </label>
    <div class="flex items-center gap-2">
      <span class="font-medium">Order:</span>
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
    <slot name="no-results" />
  {/if}

  <InfiniteScroll
    hasMore={$query.hasNextPage}
    fetchMore={() => !$query.isFetching && $query.fetchNextPage()}
  >
    <ul class="list-none">
      {#each $query.data.pages as { data }}
        {#each data as item}
          <li class="flex items-center">
            <slot {item} />
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
