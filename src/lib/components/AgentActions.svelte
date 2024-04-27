<script lang="ts">
  import { goto, preloadData } from "$app/navigation";
  import { page } from "$app/stores";
  import Toast from "$lib/components/Toast.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { toast } from "svelte-sonner";
  import type { PageData as EditData } from "../../routes/(app)/agents/[id]/edit/$types";
  import EditPage from "../../routes/(app)/agents/[id]/edit/+page.svelte";

  const client = useQueryClient();

  const deleteAgentMutation = createMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/agents/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["agents"] });
      client.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  export let id: string;
  export let name: string;

  let editDialogOpen = false;
  let deleteDialogOpen = false;
  let editData: EditData;

  $: editUrl = `/agents/${id}/edit`;

  async function editClick() {
    const result = await preloadData(editUrl);

    if (result.type === "loaded" && result.status === 200) {
      editData = result.data as EditData;
      editDialogOpen = true;
    }
  }

  function deleteClick() {
    deleteDialogOpen = true;
  }

  function handleDelete() {
    $deleteAgentMutation.mutate(id, {
      onSuccess: () => {
        toast.success(Toast, { componentProps: { text: "Agent deleted." } });
        deleteDialogOpen = false;

        if ($page.url.pathname.includes("/agents/")) {
          goto("/agents");
        }
      }
    });
  }
</script>

<Dialog.Root bind:open={editDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit agent</Dialog.Title>
    </Dialog.Header>
    {#if editData}
      <EditPage data={editData} closeDialog={() => (editDialogOpen = false)} action={editUrl} />
    {/if}
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete agent?</AlertDialog.Title>
      <AlertDialog.Description>Are you sure you want to delete {name}?</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action on:click={handleDelete}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild let:builder>
    <Button builders={[builder]}>Actions</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item on:click={async () => await editClick()}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item on:click={() => deleteClick()}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
