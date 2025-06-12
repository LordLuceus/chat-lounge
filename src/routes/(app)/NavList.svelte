<script lang="ts">
  import InfiniteScroll from "$lib/components/InfiniteScroll.svelte";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import type { PagedResponse } from "$lib/types/api";
  import type { CreateInfiniteQueryResult, InfiniteData } from "@tanstack/svelte-query";

  interface Props {
    query: CreateInfiniteQueryResult<InfiniteData<PagedResponse<any>, unknown>, Error>;
    itemType: string;
    link?: import('svelte').Snippet<[any]>;
    menu?: import('svelte').Snippet<[any]>;
  }

  let {
    query,
    itemType,
    link,
    menu
  }: Props = $props();

  let open = $state(false);
</script>

<Collapsible.Root bind:open>
  <Collapsible.Trigger aria-expanded={open}>{itemType}</Collapsible.Trigger>
  <Collapsible.Content>
    {#if $query.isSuccess}
      <InfiniteScroll
        hasMore={$query.hasNextPage}
        fetchMore={() => !$query.isFetching && $query.fetchNextPage()}
      >
        <ul class="list-none">
          {#each $query.data.pages as { data }}
            {#each data as item}
              <li class="flex items-center">
                {@render link?.({ item, })}
                {@render menu?.({ item, })}
              </li>
            {/each}
          {/each}
        </ul>
      </InfiniteScroll>
    {/if}
    <a href={`/${itemType.toLowerCase()}`}>All {itemType}</a>
  </Collapsible.Content>
</Collapsible.Root>
