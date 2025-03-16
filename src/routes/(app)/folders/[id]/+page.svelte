<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import ConversationActions from "$lib/components/ConversationActions.svelte";
  import DataList from "$lib/components/DataList.svelte";
  import * as Card from "$lib/components/ui/card";
  import type { Conversation } from "$lib/drizzle/schema";
  import { searchParams, type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import { createInfiniteQuery } from "@tanstack/svelte-query";
  import { onDestroy } from "svelte";
  import Time from "svelte-time";
  import { derived } from "svelte/store";
  import type { PageData } from "./$types";

  export let data: PageData;

  const fetchConversations = async (
    { pageParam = 1 },
    { search, sortBy, sortOrder, folderId }: SearchParams
  ) => {
    const url = new URL("/api/conversations", $page.url.origin);

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

  const conversationsQuery = createInfiniteQuery<PagedResponse<Conversation>>(
    derived(searchParams, ($searchParams) => ({
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
    }))
  );

  onDestroy(() => {
    if (browser) searchParams.set({ search: "", sortBy: "", sortOrder: "", folderId: undefined });
  });

  $: if (data.folder) {
    searchParams.set({ ...$searchParams, folderId: data.folder.id });
  }
</script>

<svelte:head>
  <title>{data.folder?.name} | ChatLounge</title>
  <meta name="description" content={data.folder?.name} />
</svelte:head>

<h1>{data.folder?.name}</h1>

<DataList query={conversationsQuery} let:item searchLabel="Search conversations in folder">
  <p slot="no-results">No conversations found.</p>
  <Card.Root>
    <Card.Header>
      <Card.Title tag="h2">
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
</DataList>
