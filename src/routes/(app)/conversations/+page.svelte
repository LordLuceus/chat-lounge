<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import ConversationActions from "$lib/components/ConversationActions.svelte";
  import DataList from "$lib/components/DataList.svelte";
  import * as Card from "$lib/components/ui/card";
  import { searchParams, type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { Conversation } from "@prisma/client";
  import { createInfiniteQuery } from "@tanstack/svelte-query";
  import { onDestroy } from "svelte";
  import Time from "svelte-time";
  import { derived } from "svelte/store";

  const fetchConversations = async (
    { pageParam = 1 },
    { search, sortBy, sortOrder }: SearchParams
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
    if (browser) searchParams.set({ search: "", sortBy: "", sortOrder: "" });
  });

  const conversationSortOptions = [
    { label: "Name", value: "name" },
    { label: "Created", value: "createdAt" },
    { label: "Updated", value: "lastUpdated" }
  ];
</script>

<svelte:head>
  <title>Conversations | ChatLounge</title>
  <meta name="description" content="Your ChatLounge conversations" />
</svelte:head>

<h1>Conversations</h1>

<DataList
  query={conversationsQuery}
  
  searchLabel="Search conversations"
  {searchParams}
  sortOptions={conversationSortOptions}
  defaultSortBy="lastUpdated"
  defaultSortOrder="DESC"
>
  <!-- @migration-task: migrate this slot by hand, `no-results` is an invalid identifier -->
  <p slot="no-results">No conversations found.</p>
  {#snippet children({ item })}
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
  {/snippet}
</DataList>
