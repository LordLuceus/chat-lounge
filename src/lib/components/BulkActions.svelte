<script lang="ts">
  import FolderSelectModal from "$lib/components/FolderSelectModal.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import { Check, Trash2 } from "@lucide/svelte";
  import type { Folder } from "@prisma/client";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { toast } from "svelte-sonner";

  interface ConversationItem {
    id: string;
    isPinned: boolean;
    folderId: string | null;
    sharedConversationId: string | null;
  }

  interface Props {
    selectedIds: Set<string>;
    selectedItems?: unknown[];
    resourceType: "conversations" | "agents" | "folders";
    onClearSelection: () => void;
  }

  const { selectedIds, selectedItems = [], resourceType, onClearSelection }: Props = $props();

  const client = useQueryClient();

  const bulkDeleteMutation = createMutation(() => ({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`/api/${resourceType}/bulk`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids, action: "delete" })
      });
      if (!response.ok) throw new Error("Failed to delete items");
      return response.json();
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: [resourceType] });
      client.invalidateQueries({ queryKey: ["folders"] });
      onClearSelection();
      toast.success(`${data.deleted} item${data.deleted > 1 ? "s" : ""} deleted successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to delete items: ${error.message}`);
    }
  }));

  const bulkPinMutation = createMutation(() => ({
    mutationFn: async ({ ids, pin }: { ids: string[]; pin: boolean }) => {
      const response = await fetch(`/api/${resourceType}/bulk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids, action: pin ? "pin" : "unpin" })
      });
      if (!response.ok) throw new Error("Failed to update pins");
      return response.json();
    },
    onSuccess: (data, { pin }) => {
      client.invalidateQueries({ queryKey: [resourceType] });
      onClearSelection();
      toast.success(
        `${data.updated} item${data.updated > 1 ? "s" : ""} ${pin ? "pinned" : "unpinned"} successfully`
      );
    },
    onError: (error) => {
      toast.error(`Failed to update pins: ${error.message}`);
    }
  }));

  const bulkAddToFolderMutation = createMutation(() => ({
    mutationFn: async ({ ids, folderId }: { ids: string[]; folderId: string }) => {
      const response = await fetch(`/api/${resourceType}/bulk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids, action: "addToFolder", folderId })
      });
      if (!response.ok) throw new Error("Failed to add to folder");
      return response.json();
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: [resourceType] });
      client.invalidateQueries({ queryKey: ["folders"] });
      onClearSelection();
      toast.success(
        `${data.updated} item${data.updated > 1 ? "s" : ""} added to folder successfully`
      );
    },
    onError: (error) => {
      toast.error(`Failed to add to folder: ${error.message}`);
    }
  }));

  const bulkRemoveFromFolderMutation = createMutation(() => ({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`/api/${resourceType}/bulk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids, action: "removeFromFolder" })
      });
      if (!response.ok) throw new Error("Failed to remove from folder");
      return response.json();
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: [resourceType] });
      client.invalidateQueries({ queryKey: ["folders"] });
      onClearSelection();
      toast.success(
        `${data.updated} item${data.updated > 1 ? "s" : ""} removed from folder successfully`
      );
    },
    onError: (error) => {
      toast.error(`Failed to remove from folder: ${error.message}`);
    }
  }));

  const bulkShareMutation = createMutation(() => ({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`/api/${resourceType}/bulk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids, action: "share" })
      });
      if (!response.ok) throw new Error("Failed to share items");
      return response.json();
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: [resourceType] });
      client.invalidateQueries({ queryKey: ["sharedConversations"] });
      onClearSelection();
      toast.success(`${data.updated} item${data.updated > 1 ? "s" : ""} shared successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to share items: ${error.message}`);
    }
  }));

  const bulkUnshareMutation = createMutation(() => ({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`/api/${resourceType}/bulk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids, action: "unshare" })
      });
      if (!response.ok) throw new Error("Failed to unshare items");
      return response.json();
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: [resourceType] });
      client.invalidateQueries({ queryKey: ["sharedConversations"] });
      onClearSelection();
      toast.success(`${data.updated} item${data.updated > 1 ? "s" : ""} unshared successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to unshare items: ${error.message}`);
    }
  }));

  let deleteDialogOpen = $state(false);
  let addToFolderDialogOpen = $state(false);

  const selectedCount = $derived(selectedIds.size);

  function handleBulkDelete() {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
    deleteDialogOpen = false;
  }

  function handleAddToFolder(folder: Folder) {
    bulkAddToFolderMutation.mutate({
      ids: Array.from(selectedIds),
      folderId: folder.id
    });
    addToFolderDialogOpen = false;
  }

  const canPin = $derived(resourceType === "conversations");
  const canShare = $derived(resourceType === "conversations");
  const canAddToFolder = $derived(resourceType === "conversations");

  // Context-aware action visibility based on selection
  const selectionState = $derived(() => {
    if (resourceType !== "conversations" || selectedItems.length === 0) {
      return {
        showPin: false,
        showUnpin: false,
        showAddToFolder: false,
        showRemoveFromFolder: false,
        showShare: false,
        showUnshare: false
      };
    }

    const selectedConversations = selectedItems.filter((item: unknown) =>
      selectedIds.has((item as ConversationItem).id)
    ) as ConversationItem[];

    // Pin/Unpin logic
    const allPinned = selectedConversations.every((item) => item.isPinned);
    const allUnpinned = selectedConversations.every((item) => !item.isPinned);

    // Folder logic
    const allInFolder = selectedConversations.every((item) => item.folderId);
    const allNotInFolder = selectedConversations.every((item) => !item.folderId);

    // Share logic
    const allShared = selectedConversations.every((item) => item.sharedConversationId);
    const allUnshared = selectedConversations.every((item) => !item.sharedConversationId);

    return {
      showPin: allUnpinned,
      showUnpin: allPinned,
      showAddToFolder: allNotInFolder,
      showRemoveFromFolder: allInFolder,
      showShare: allUnshared,
      showUnshare: allShared
    };
  });
</script>

{#if selectedCount > 0}
  <div
    class="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
  >
    <Check class="h-4 w-4 text-blue-600" />
    <span class="text-sm font-medium"
      >{selectedCount} item{selectedCount > 1 ? "s" : ""} selected</span
    >

    <div class="ml-auto flex gap-2">
      {#if canPin && selectionState().showPin}
        <Button
          size="sm"
          variant="outline"
          onclick={() => bulkPinMutation.mutate({ ids: Array.from(selectedIds), pin: true })}
        >
          Pin
        </Button>
      {/if}

      {#if canPin && selectionState().showUnpin}
        <Button
          size="sm"
          variant="outline"
          onclick={() => bulkPinMutation.mutate({ ids: Array.from(selectedIds), pin: false })}
        >
          Unpin
        </Button>
      {/if}

      {#if canAddToFolder && selectionState().showAddToFolder}
        <Button
          size="sm"
          variant="outline"
          onclick={() => {
            addToFolderDialogOpen = true;
          }}
        >
          Add to Folder
        </Button>
      {/if}

      {#if canAddToFolder && selectionState().showRemoveFromFolder}
        <Button
          size="sm"
          variant="outline"
          onclick={() => bulkRemoveFromFolderMutation.mutate(Array.from(selectedIds))}
        >
          Remove from Folder
        </Button>
      {/if}

      {#if canShare && selectionState().showShare}
        <Button
          size="sm"
          variant="outline"
          onclick={() => bulkShareMutation.mutate(Array.from(selectedIds))}
        >
          Share
        </Button>
      {/if}

      {#if canShare && selectionState().showUnshare}
        <Button
          size="sm"
          variant="outline"
          onclick={() => bulkUnshareMutation.mutate(Array.from(selectedIds))}
        >
          Unshare
        </Button>
      {/if}

      <Button
        size="sm"
        variant="destructive"
        onclick={() => {
          deleteDialogOpen = true;
        }}
      >
        <Trash2 class="mr-1 h-4 w-4" />
        Delete
      </Button>

      <Button size="sm" variant="ghost" onclick={onClearSelection}>Clear Selection</Button>
    </div>
  </div>
{/if}

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title
        >Delete {selectedCount} item{selectedCount > 1 ? "s" : ""}?</AlertDialog.Title
      >
      <AlertDialog.Description>
        Are you sure you want to delete {selectedCount}
        {resourceType}? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleBulkDelete}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<FolderSelectModal
  open={addToFolderDialogOpen}
  title="Add {selectedCount} item{selectedCount > 1 ? 's' : ''} to folder"
  description="Select a folder to add the selected items to."
  onFolderSelect={handleAddToFolder}
  onOpenChange={(open) => (addToFolderDialogOpen = open)}
/>
