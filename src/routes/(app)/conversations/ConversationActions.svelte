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

  export let conversationId: string;
  export let conversationName: string;

  const client = useQueryClient();

  const renameConversationMutation = createMutation({
    mutationFn: async (newName: string) =>
      (
        await fetch(`/api/conversations/${conversationId}`, {
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
    onSuccess: () => client.invalidateQueries({ queryKey: ["conversations"] })
  });

  let renameDialogOpen = false;
  let deleteDialogOpen = false;
  let newName = "";

  $: newName = conversationName;

  function renameClick() {
    renameDialogOpen = true;
  }

  function deleteClick() {
    deleteDialogOpen = true;
  }

  function handleRename() {
    $renameConversationMutation.mutate(newName, {
      onSuccess: () => {
        renameDialogOpen = false;
      }
    });
  }

  function handleDelete() {
    $deleteConversationMutation.mutate(conversationId, {
      onSuccess: () => {
        toast.success(Toast, { componentProps: { text: "Conversation deleted." } });
        deleteDialogOpen = false;

        if ($page.url.pathname.includes(conversationId)) {
          goto("/");
        }
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
      <AlertDialog.Description
        >Are you sure you want to delete {conversationName}?</AlertDialog.Description
      >
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action on:click={handleDelete}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<div class="flex items-center justify-between p-4">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>Menu</DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Item on:click={renameClick}>Rename</DropdownMenu.Item>
      <DropdownMenu.Item on:click={deleteClick}>Delete</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
