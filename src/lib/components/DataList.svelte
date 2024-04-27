<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { searchParams } from "$lib/stores/search-params";
  import type { PagedResponse } from "$lib/types/api/paged-response";
  import type { CreateInfiniteQueryResult, InfiniteData } from "@tanstack/svelte-query";
  import InfiniteScroll from "svelte-infinite-scroll";
  import Search from "svelte-search";

  export let query: CreateInfiniteQueryResult<InfiniteData<PagedResponse<any>, unknown>, Error>;
  export let loadMore;
  export let searchLabel: string;

  $: search = $searchParams.search;

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
  value={search}
  on:type={({ detail }) => setSearch(detail)}
/>
{#if $searchParams.search}
  <Button on:click={() => setSearch("")}>Clear search</Button>
{/if}

{#if $query.isSuccess}
  {#if $query.data.pages[0].meta.total === 0}
    <p>No results found</p>
  {/if}

  <ul class="list-none">
    {#each $query.data.pages as { data }}
      {#each data as item (item.id)}
        <li class="flex items-center">
          <slot {item} />
        </li>
      {/each}
    {/each}
    <InfiniteScroll threshold={100} on:loadMore={loadMore} />
  </ul>
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
