<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Toast from "$lib/components/Toast.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Input } from "$lib/components/ui/input";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { toast } from "svelte-sonner";

  export let id: string;
  export let name: string;
  export let isPinned: boolean;
  export let sharedConversationId: string | undefined;

  const client = useQueryClient();

  const renameConversationMutation = createMutation({
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
  });

  const deleteConversationMutation = createMutation({
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
  });

  const shareConversationMutation = createMutation({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/conversations/${id}/share`, {
          method: "POST"
        })
      ).json(),
    onSuccess: ({ id }) => {
      // Copy the shared conversation link to the clipboard
      const url = `${window.location.origin}/conversations/shared/${id}`;
      navigator.clipboard.writeText(url);
      toast.success(Toast, {
        componentProps: { text: "Conversation shared successfully. Copied link to clipboard." }
      });
      client.invalidateQueries({ queryKey: ["sharedConversations"] });
      client.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  const unshareConversationMutation = createMutation({
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
  });

  const togglePinnedConversationMutation = createMutation({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/conversations/${id}/toggle-pin`, {
          method: "PUT"
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(Toast, {
        componentProps: { text: `Conversation ${isPinned ? "unpinned" : "pinned"} successfully.` }
      });
    }
  });

  let renameDialogOpen = false;
  let deleteDialogOpen = false;
  let shareDialogOpen = false;
  let unshareDialogOpen = false;
  let newName = "";

  $: newName = name;

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

  function handleRename() {
    $renameConversationMutation.mutate(newName, {
      onSuccess: () => {
        renameDialogOpen = false;
      }
    });
  }

  function handleDelete(conversationId: string) {
    $deleteConversationMutation.mutate(conversationId, {
      onSuccess: () => {
        deleteDialogOpen = false;
        toast.success(Toast, { componentProps: { text: "Conversation deleted." } });

        if ($page.url.pathname.includes(conversationId)) {
          goto("/");
        }
      }
    });
  }

  function handleShare() {
    $shareConversationMutation.mutate(id, {
      onSuccess: () => {
        shareDialogOpen = false;
      }
    });
  }

  function handleUnshare() {
    if (!sharedConversationId) return;
    $unshareConversationMutation.mutate(sharedConversationId, {
      onSuccess: () => {
        unshareDialogOpen = false;
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
      <Button disabled={!newName} on:click={handleRename}>Rename</Button>
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
      <AlertDialog.Action on:click={() => handleDelete(id)}>Delete</AlertDialog.Action>
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
      <AlertDialog.Action on:click={handleUnshare}>Unshare</AlertDialog.Action>
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
      <Button on:click={handleShare}>Share</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item on:click={renameClick}>Rename</DropdownMenu.Item>
    <DropdownMenu.Item on:click={() => $togglePinnedConversationMutation.mutate(id)}
      >{isPinned ? "Unpin" : "Pin to top"}</DropdownMenu.Item
    >
    {#if sharedConversationId}
      <DropdownMenu.Item on:click={unshareClick}>Unshare</DropdownMenu.Item>
    {:else}
      <DropdownMenu.Item on:click={shareClick}>Share</DropdownMenu.Item>
    {/if}
    <DropdownMenu.Item on:click={deleteClick}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
