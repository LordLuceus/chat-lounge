<script lang="ts">
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import DataList from "$lib/components/DataList.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Input } from "$lib/components/ui/input";
  import type { SearchParams } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { Folder } from "@prisma/client";
  import { createInfiniteQuery, createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { onDestroy } from "svelte";
  import { toast } from "svelte-sonner";
  import { get, writable } from "svelte/store";

  interface Props {
    id: string;
    name: string;
    isPinned: boolean;
    sharedConversationId: string | undefined;
    folderId: string | undefined;
  }

  const { id, name, isPinned, sharedConversationId, folderId }: Props = $props();

  const searchParams = writable<SearchParams>({
    search: "",
    sortBy: "",
    sortOrder: ""
  });

  const client = useQueryClient();

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

  const foldersQuery = createInfiniteQuery<PagedResponse<Folder>>(() => {
    const params = get(searchParams);
    return {
      queryKey: ["folders", params],
      queryFn: ({ pageParam }: { pageParam: unknown }) =>
        fetchFolders({ pageParam: pageParam as number }, params),
      initialPageParam: 1,
      getNextPageParam: (lastPage: PagedResponse<Folder>) => {
        if (lastPage.meta.page < lastPage.meta.totalPages) {
          return lastPage.meta.page + 1;
        }

        return undefined;
      }
    };
  });
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

  const renameConversationMutation = createMutation(() => ({
    mutationFn: async (newName: string) =>
      (
        await fetch(`/api/conversations/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: newName })
        })
      ).json(),
    onSuccess: () => client.invalidateQueries({ queryKey: ["conversations"] })
  }));

  const deleteConversationMutation = createMutation(() => ({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/conversations/${id}`, {
          method: "DELETE"
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"], exact: true });
      client.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "conversations" && query.queryKey[1] !== id
      });
    }
  }));

  const shareConversationMutation = createMutation(() => ({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/conversations/${id}/share`, {
          method: "POST"
        })
      ).json(),
    onSuccess: ({ id }) => {
      const url = `${window.location.origin}/conversations/shared/${id}`;
      navigator.clipboard.writeText(url);
      toast.success("Conversation shared successfully. Copied link to clipboard.");
      client.invalidateQueries({ queryKey: ["sharedConversations"] });
      client.invalidateQueries({ queryKey: ["conversations"] });
    }
  }));

  const unshareConversationMutation = createMutation(() => ({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/conversations/shared/${id}`, {
          method: "DELETE"
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["sharedConversations"] });
      client.invalidateQueries({ queryKey: ["conversations"] });
    }
  }));

  const togglePinnedConversationMutation = createMutation(() => ({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/conversations/${id}/toggle-pin`, {
          method: "PUT"
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`Conversation ${isPinned ? "unpinned" : "pinned"} successfully.`);
    }
  }));

  const addToFolderMutation = createMutation(() => ({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/folders/${selectedFolderId}/add-conversation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ conversationId: id })
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"] });
      client.invalidateQueries({ queryKey: ["folders"] });
    }
  }));

  const removeFromFolderMutation = createMutation(() => ({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/folders/${folderId}/remove-conversation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ conversationId: id })
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"] });
      client.invalidateQueries({ queryKey: ["folders"] });
    }
  }));

  let renameDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let shareDialogOpen = $state(false);
  let unshareDialogOpen = $state(false);
  let addToFolderDialogOpen = $state(false);
  let newName = $state(name);
  let selectedFolderId: string | undefined = $state();

  function renameClick() {
    renameDialogOpen = true;
  }

  function deleteClick() {
    deleteDialogOpen = true;
  }

  function shareClick() {
    shareDialogOpen = true;
  }

  function unshareClick() {
    unshareDialogOpen = true;
  }

  function addToFolderClick() {
    addToFolderDialogOpen = true;
  }

  function handleRename() {
    renameConversationMutation.mutate(newName, {
      onSuccess: () => {
        renameDialogOpen = false;
      }
    });
  }

  function handleDelete(conversationId: string) {
    deleteConversationMutation.mutate(conversationId, {
      onSuccess: () => {
        deleteDialogOpen = false;
        toast.success("Conversation deleted.");

        if (page.url.pathname.includes(conversationId)) {
          goto("/");
        }
      }
    });
  }

  function handleShare() {
    shareConversationMutation.mutate(id, {
      onSuccess: () => {
        shareDialogOpen = false;
      }
    });
  }

  function handleUnshare() {
    if (!sharedConversationId) return;
    unshareConversationMutation.mutate(sharedConversationId, {
      onSuccess: () => {
        unshareDialogOpen = false;
      }
    });
  }

  function handleAddToFolder() {
    addToFolderMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Conversation added to folder successfully.");
        addToFolderDialogOpen = false;
      }
    });
  }

  function handleRemoveFromFolder() {
    removeFromFolderMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Conversation removed from folder successfully.");
      }
    });
  }
</script>

<Dialog.Root bind:open={renameDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Rename conversation</Dialog.Title>
    </Dialog.Header>
    <Input bind:value={newName} />
    <Dialog.Footer>
      <Button disabled={!newName} onclick={handleRename}>Rename</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete conversation</AlertDialog.Title>
      <AlertDialog.Description>Are you sure you want to delete {name}?</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => handleDelete(id)}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={unshareDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Unshare conversation</AlertDialog.Title>
      <AlertDialog.Description
        >Are you sure you want to stop sharing {name}?</AlertDialog.Description
      >
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleUnshare}>Unshare</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<Dialog.Root bind:open={shareDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Share conversation</Dialog.Title>
      <Dialog.Description
        >Share this conversation with other users. This will copy a link to the shared conversation
        that you can share with your friends. Any messages beyond this point will not be shared.</Dialog.Description
      >
    </Dialog.Header>
    <Dialog.Footer>
      <Button onclick={handleShare}>Share</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={addToFolderDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add conversation to folder</Dialog.Title>
      <Dialog.Description>Add this conversation to a folder.</Dialog.Description>
      <DataList query={foldersQuery} searchLabel="Search folders" {searchParams}>
        {#snippet noResults()}
          <p>No folders found.</p>
        {/snippet}
        {#snippet children({ item })}
          <div>
            <Button
              onclick={() => {
                selectedFolderId = item.id;
                handleAddToFolder();
              }}>{item.name}</Button
            >
          </div>
        {/snippet}
      </DataList>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onclick={renameClick}>Rename</DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => togglePinnedConversationMutation.mutate(id)}
      >{isPinned ? "Unpin" : "Pin to top"}</DropdownMenu.Item
    >
    {#if folderId}
      <DropdownMenu.Item onclick={handleRemoveFromFolder}>Remove from folder</DropdownMenu.Item>
    {:else}
      <DropdownMenu.Item onclick={addToFolderClick}>Add to folder</DropdownMenu.Item>
    {/if}
    {#if sharedConversationId}
      <DropdownMenu.Item onclick={unshareClick}>Unshare</DropdownMenu.Item>
    {:else}
      <DropdownMenu.Item onclick={shareClick}>Share</DropdownMenu.Item>
    {/if}
    <DropdownMenu.Item onclick={deleteClick}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
