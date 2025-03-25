<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import DataList from "$lib/components/DataList.svelte";
  import SharedConversationActions from "$lib/components/SharedConversationActions.svelte";
  import * as Card from "$lib/components/ui/card";
  import { searchParams, type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { SharedConversation } from "@prisma/client";
  import { createInfiniteQuery } from "@tanstack/svelte-query";
  import { onDestroy } from "svelte";
  import Time from "svelte-time";
  import { derived } from "svelte/store";

  const fetchConversations = async (
    { pageParam = 1 },
    { search, sortBy, sortOrder }: SearchParams
  ) => {
    const url = new URL("/api/conversations/shared", $page.url.origin);

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

    return await fetch(url.toString()).then((res) => res.json());
  };

  const conversationsQuery = createInfiniteQuery<PagedResponse<SharedConversation>>(
    derived(searchParams, ($searchParams) => ({
      queryKey: ["sharedConversations", $searchParams],
      queryFn: ({ pageParam }: { pageParam: unknown }) =>
        fetchConversations({ pageParam: pageParam as number }, $searchParams),
      initialPageParam: 1,
      getNextPageParam: (lastPage: PagedResponse<SharedConversation>) => {
        if (lastPage.meta.page < lastPage.meta.totalPages) {
          return lastPage.meta.page + 1;
        }

        return undefined;
      }
    }))
  );

  onDestroy(() => {
    if (browser) searchParams.set({ search: "", sortBy: "", sortOrder: "" });
  });
</script>

<svelte:head>
  <title>Shared Conversations | ChatLounge</title>
  <meta name="description" content="Your shared conversations" />
</svelte:head>

<h1>Shared Conversations</h1>

<DataList query={conversationsQuery} let:item searchLabel="Search conversations" {searchParams}>
  <p slot="no-results">No conversations found.</p>
  <Card.Root>
    <Card.Header>
      <Card.Title tag="h2">
        <a href={`/conversations/shared/${item.id}`}>{item.name}</a>
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <p>
        <strong>Shared </strong>
        <Time timestamp={item.sharedAt} relative />
      </p>
    </Card.Content>
    <Card.Footer>
      <SharedConversationActions id={item.id} name={item.name} />
    </Card.Footer>
  </Card.Root>
</DataList>
