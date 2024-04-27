<script lang="ts">
  import * as Collapsible from "$lib/components/ui/collapsible";
  import type { PagedResponse } from "$lib/types/api/paged-response";
  import InfiniteScroll from "svelte-infinite-scroll";

  export let pages: PagedResponse<any>[];
  export let loadMore;
  export let itemType: string;

  let open = false;
</script>

<Collapsible.Root bind:open>
  <Collapsible.Trigger aria-expanded={open}>{itemType}</Collapsible.Trigger>
  <Collapsible.Content>
    <ul class="list-none">
      {#each pages as { data }}
        {#each data as item}
          <li class="flex items-center">
            <slot name="link" {item} />
            <slot name="menu" {item} />
          </li>
        {/each}
      {/each}
      <InfiniteScroll threshold={100} on:loadMore={loadMore} />
    </ul>
    <a href={`/${itemType.toLowerCase()}`}>All {itemType}</a>
  </Collapsible.Content>
</Collapsible.Root>
