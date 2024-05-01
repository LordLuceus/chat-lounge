<script lang="ts">
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import { Button } from "$lib/components/ui/button";
  import { searchParams } from "$lib/stores/search-params";
  import type { PagedResponse } from "$lib/types/api/paged-response";
  import type { CreateInfiniteQueryResult, InfiniteData } from "@tanstack/svelte-query";
  import Search from "svelte-search";

  export let query: CreateInfiniteQueryResult<InfiniteData<PagedResponse<any>, unknown>, Error>;
  export let searchLabel: string;

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
    <p>No results found</p>
  {/if}

  <InfiniteScroll
    hasMore={$query.hasNextPage}
    fetchMore={() => !$query.isFetching && $query.fetchNextPage()}
  >
    <ul class="list-none">
      {#each $query.data.pages as { data }}
        {#each data as item (item.id)}
          <li class="flex items-center">
            <slot {item} />
          </li>
        {/each}
      {/each}
    </ul>
  </InfiniteScroll>
{/if}

{#if $query.isFetching}
  <p>Loading...</p>
{/if}

{#if $query.isError}
  <p>Error: {$query.error.message}</p>
{/if}

{#if srAlertMessage && $searchParams.search}
  <div class="sr-only" role="alert">
    <p>{srAlertMessage}</p>
  </div>
{/if}
