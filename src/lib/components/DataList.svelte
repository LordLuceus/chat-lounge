<script lang="ts">
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import { Button } from "$lib/components/ui/button";
  import { type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { CreateInfiniteQueryResult, InfiniteData } from "@tanstack/svelte-query";
  import { Loader } from "lucide-svelte";
  import Search from "svelte-search";
  import type { Writable } from "svelte/store";

  export let query: CreateInfiniteQueryResult<InfiniteData<PagedResponse<any>, unknown>, Error>;
  export let searchLabel: string;
  export let searchParams: Writable<SearchParams>;

  let value = "";

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
