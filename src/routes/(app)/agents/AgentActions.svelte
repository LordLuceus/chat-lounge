<script lang="ts">
  import { preloadData } from "$app/navigation";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import type { PageData as DeleteData } from "./[id]/delete/$types";
  import DeletePage from "./[id]/delete/+page.svelte";
  import type { PageData as EditData } from "./[id]/edit/$types";
  import EditPage from "./[id]/edit/+page.svelte";

  export let clickText: string;
  export let agentId: string;

  let editDialogOpen = false;
  let deleteDialogOpen = false;
  let editData: EditData;
  let deleteData: DeleteData;

  $: editUrl = `/agents/${agentId}/edit`;
  $: deleteUrl = `/agents/${agentId}/delete`;

  async function editClick() {
    const result = await preloadData(editUrl);

    if (result.type === "loaded" && result.status === 200) {
      editData = result.data as EditData;
      editDialogOpen = true;
    }
  }

  async function deleteClick() {
    const result = await preloadData(deleteUrl);

    if (result.type === "loaded" && result.status === 200) {
      deleteData = result.data as DeleteData;
      deleteDialogOpen = true;
    }
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
      <AlertDialog.Description>Are you sure you want to delete this agent?</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      {#if deleteData}
        <DeletePage data={deleteData} action={deleteUrl} />
      {/if}
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild let:builder>
    <Button builders={[builder]}>{clickText}</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item on:click={async () => await editClick()}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item on:click={async () => await deleteClick()}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
