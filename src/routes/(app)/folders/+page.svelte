<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import CreateFolderDialog from "$lib/components/CreateFolderDialog.svelte";
  import DataList from "$lib/components/DataList.svelte";
  import FolderActions from "$lib/components/FolderActions.svelte";
  import * as Card from "$lib/components/ui/card";
  import { searchParams, type SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { Folder } from "@prisma/client";
  import { createInfiniteQuery } from "@tanstack/svelte-query";
  import { onDestroy } from "svelte";
  import { SignedIn } from "svelte-clerk";
  import { useClerkContext } from "svelte-clerk/client";
  import Time from "svelte-time";

  const ctx = useClerkContext();
  const user = $derived(ctx.user);

  const fetchFolders = async (
    { pageParam = 1 },
    { search, sortBy, sortOrder, folderId }: SearchParams
  ) => {
    const url = new URL("/api/folders", page.url.origin);

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

    return fetch(url.toString()).then((res) => res.json());
  };

  const foldersQuery = $derived(
    createInfiniteQuery<PagedResponse<Folder>>(() => {
      return {
        queryKey: ["folders", $searchParams],
        queryFn: ({ pageParam }: { pageParam: unknown }) =>
          fetchFolders({ pageParam: pageParam as number }, $searchParams),
        initialPageParam: 1,
        getNextPageParam: (lastPage: PagedResponse<Folder>) => {
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
      searchParams.set({
        search: "",
        sortBy: "",
        sortOrder: "",
        ownerOnly: false,
        visibility: "",
        folderId: undefined
      });
  });

  const folderSortOptions = [
    { label: "Name", value: "name" },
    { label: "Created", value: "createdAt" },
    { label: "Updated", value: "updatedAt" }
  ];
</script>

<svelte:head>
  <title>Folders | ChatLounge</title>
</svelte:head>

<h1>Folders</h1>

<CreateFolderDialog />

<SignedIn>
  <DataList
    query={foldersQuery}
    searchLabel="Search folders"
    {searchParams}
    sortOptions={folderSortOptions}
    defaultSortBy="updatedAt"
    defaultSortOrder="DESC"
  >
    {#snippet noResults()}
      <p>No folders found.</p>
    {/snippet}
    {#snippet children({ item })}
      <Card.Root>
        <Card.Header>
          <Card.Title level={2}>
            <a href={`/folders/${item.id}`}>{item.name}</a>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <p>
            <strong>Last updated </strong>
            <Time timestamp={item.updatedAt} relative />
          </p>
        </Card.Content>
        <Card.Footer>
          <FolderActions id={item.id} name={item.name} />
        </Card.Footer>
      </Card.Root>
    {/snippet}
  </DataList>
</SignedIn>
