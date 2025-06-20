<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import AgentActions from "$lib/components/AgentActions.svelte";
  import DataList from "$lib/components/DataList.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  import { searchParams, type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import { Visibility } from "$lib/types/db";
  import type { Agent } from "@prisma/client";
  import { createInfiniteQuery } from "@tanstack/svelte-query";
  import { onDestroy } from "svelte";
  import { SignedIn } from "svelte-clerk";
  import { useClerkContext } from "svelte-clerk/client";
  import Time from "svelte-time";
  import type { PageData } from "./$types";
  import AgentForm from "./AgentForm.svelte";

  const ctx = useClerkContext();
  const user = $derived(ctx.user);

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  const fetchAgents = async (
    { pageParam = 1 },
    { search, sortBy, sortOrder, visibility, ownerOnly }: SearchParams
  ) => {
    const url = new URL("/api/agents", page.url.origin);

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
    if (visibility) {
      url.searchParams.set("visibility", visibility);
    }
    if (ownerOnly) {
      url.searchParams.set("ownerOnly", ownerOnly.toString());
    }

    return fetch(url.toString()).then((res) => res.json());
  };

  const agentsQuery = $derived(
    createInfiniteQuery<PagedResponse<Agent>>(() => {
      return {
        queryKey: ["agents", $searchParams],
        queryFn: ({ pageParam }: { pageParam: unknown }) =>
          fetchAgents({ pageParam: pageParam as number }, $searchParams),
        initialPageParam: 1,
        getNextPageParam: (lastPage: PagedResponse<Agent>) => {
          if (lastPage.meta.page < lastPage.meta.totalPages) {
            return lastPage.meta.page + 1;
          }

          return undefined;
        }
      };
    })
  );

  onDestroy(() => {
    if (browser)
      searchParams.set({ search: "", sortBy: "", sortOrder: "", ownerOnly: false, visibility: "" });
  });

  const agentSortOptions = [
    { label: "Name", value: "name" },
    { label: "Created", value: "createdAt" },
    { label: "Updated", value: "updatedAt" },
    { label: "Last used", value: "lastUsedAt" }
  ];
</script>

<svelte:head>
  <title>Agents | ChatLounge</title>
</svelte:head>

<h1>Agents</h1>

<Dialog.Root>
  <Dialog.Trigger>Create agent</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Create a new agent</Dialog.Title>
    </Dialog.Header>
    <AgentForm data={data.form} />
  </Dialog.Content>
</Dialog.Root>

<ToggleGroup.Root
  type="single"
  onValueChange={(value) => {
    if (value === "mine") {
      searchParams.update((params) => ({ ...params, ownerOnly: true, visibility: undefined }));
    } else if (value === "public") {
      searchParams.update((params) => ({
        ...params,
        ownerOnly: false,
        visibility: Visibility.Public
      }));
    } else {
      searchParams.update((params) => ({ ...params, ownerOnly: false, visibility: undefined }));
    }
  }}
>
  <ToggleGroup.Item value="mine">My agents</ToggleGroup.Item>
  <ToggleGroup.Item value="public">Public agents</ToggleGroup.Item>
</ToggleGroup.Root>

<SignedIn>
  <DataList
    query={agentsQuery}
    searchLabel="Search agents"
    {searchParams}
    sortOptions={agentSortOptions}
    defaultSortBy="lastUsedAt"
    defaultSortOrder="DESC"
  >
    {#snippet noResults()}
      <p>No agents found.</p>
    {/snippet}
    {#snippet children({ item })}
      <Card.Root>
        <Card.Header>
          <Card.Title level={2}>
            <a href={`/agents/${item.id}`}>{item.name}</a>
          </Card.Title>
          {#if item.description}
            <Card.Description>{item.description}</Card.Description>
          {/if}
        </Card.Header>
        {#if item.lastUsedAt}
          <Card.Content>
            <p>
              <strong>Last chat </strong>
              <Time timestamp={item.lastUsedAt} relative />
            </p>
          </Card.Content>
        {/if}
        {#if item.userId === user?.id}
          <Card.Footer>
            <AgentActions id={item.id} name={item.name} />
          </Card.Footer>
        {/if}
      </Card.Root>
    {/snippet}
  </DataList>
</SignedIn>
