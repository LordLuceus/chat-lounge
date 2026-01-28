<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Input } from "$lib/components/ui/input";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";

  const client = useQueryClient();

  const renameFolderMutation = createMutation(() => ({
    mutationFn: async (newName: string) =>
      (
        await fetch(`/api/folders/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: newName })
        })
      ).json(),
    onSuccess: () => client.invalidateQueries({ queryKey: ["folders"] })
  }));

  const deleteFolderMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      await fetch(`/api/folders/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["folders"], exact: true });
      client.invalidateQueries({ queryKey: ["conversations"], exact: true });
      client.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "folders" && query.queryKey[1] !== id
      });
    }
  }));

  interface Props {
    id: string;
    name: string;
  }

  const { id, name }: Props = $props();

  let renameDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
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

  function handleDelete(folderId: string) {
    deleteFolderMutation.mutate(folderId, {
      onSuccess: () => {
        deleteDialogOpen = false;
        toast.success("Folder deleted.");

        if (page.url.pathname.includes(folderId)) {
          goto("/");
        }
      }
    });
  }

  function handleRename() {
    renameFolderMutation.mutate(newName, {
      onSuccess: () => {
        renameDialogOpen = false;
      }
    });
  }
</script>

<Dialog.Root bind:open={renameDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Rename folder</Dialog.Title>
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
      <AlertDialog.Title>Delete folder?</AlertDialog.Title>
      <AlertDialog.Description>Are you sure you want to delete {name}?</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => handleDelete(id)}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props}>Actions</Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onclick={() => renameClick()}>Rename</DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => deleteClick()}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
