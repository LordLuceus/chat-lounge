<script lang="ts">
  import { page } from "$app/stores";
  import Toast from "$lib/components/Toast.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { toast } from "svelte-sonner";
  import { superForm } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import AgentForm from "../AgentForm.svelte";
  import { deleteSchema } from "../schema";

  let editDialogOpen = false;
  let deleteDialogOpen = false;

  function closeEditDialog() {
    editDialogOpen = false;
  }

  const form = superForm($page.data.deleteForm, {
    validators: zodClient(deleteSchema),
    onUpdated: ({ form }) => {
      if (form.valid) {
        toast.success(Toast, { componentProps: { text: form.message } });
      }
    }
  });

  const { form: formData, enhance } = form;
</script>

<Dialog.Root bind:open={editDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit agent</Dialog.Title>
    </Dialog.Header>
    <AgentForm data={$page.data.editForm} action="?/edit" closeDialog={closeEditDialog} />
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete agent?</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this agent? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <form method="post" use:enhance action="?/delete">
        <input type="hidden" name="id" value={$page.data.agent.id} />
        <AlertDialog.Action type="submit">Delete</AlertDialog.Action>
      </form>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>{$page.data.agent.name}</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item on:click={() => (editDialogOpen = true)}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item on:click={() => (deleteDialogOpen = true)}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
