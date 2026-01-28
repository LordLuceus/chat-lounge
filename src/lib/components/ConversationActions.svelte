<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import FolderSelectModal from "$lib/components/FolderSelectModal.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Input } from "$lib/components/ui/input";
  import type { Folder } from "@prisma/client";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    id: string;
    name: string;
    isPinned: boolean;
    sharedConversationId: string | undefined;
    folderId: string | undefined;
  }

  const { id, name, isPinned, sharedConversationId, folderId }: Props = $props();

  const client = useQueryClient();

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
    mutationFn: async ({
      conversationId,
      folderId
    }: {
      conversationId: string;
      folderId: string;
    }) =>
      (
        await fetch(`/api/folders/${folderId}/add-conversation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ conversationId })
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
  let newName = $state("");

  async function renameClick() {
    await tick();
    newName = name;
    renameDialogOpen = true;
  }

  async function deleteClick() {
    await tick();
    deleteDialogOpen = true;
  }

  async function shareClick() {
    await tick();
    shareDialogOpen = true;
  }

  async function unshareClick() {
    await tick();
    unshareDialogOpen = true;
  }

  async function addToFolderClick() {
    await tick();
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

  function handleAddToFolder(folder: Folder) {
    addToFolderMutation.mutate(
      { conversationId: id, folderId: folder.id },
      {
        onSuccess: () => {
          toast.success("Conversation added to folder successfully.");
          addToFolderDialogOpen = false;
        }
      }
    );
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

<FolderSelectModal
  open={addToFolderDialogOpen}
  title="Add conversation to folder"
  description="Add this conversation to a folder."
  onFolderSelect={handleAddToFolder}
  onOpenChange={(open) => (addToFolderDialogOpen = open)}
/>

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
