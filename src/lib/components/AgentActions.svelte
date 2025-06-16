<script lang="ts">
  import { goto, preloadData } from "$app/navigation";
  import { page } from "$app/state";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { toast } from "svelte-sonner";
  import type { PageData as EditData } from "../../routes/(app)/agents/[id]/edit/$types";
  import EditPage from "../../routes/(app)/agents/[id]/edit/+page.svelte";

  const client = useQueryClient();

  const deleteAgentMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      await fetch(`/api/agents/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["agents"], exact: true });
      client.invalidateQueries({ queryKey: ["conversations"], exact: true });
      client.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "agents" && query.queryKey[1] !== id
      });
    }
  }));

  interface Props {
    id: string;
    name: string;
  }

  const { id, name }: Props = $props();

  let editDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let editData: EditData | null = $state(null);

  const editUrl = $derived(`/agents/${id}/edit`);

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

  function handleDelete(agentId: string) {
    deleteAgentMutation.mutate(agentId, {
      onSuccess: () => {
        deleteDialogOpen = false;
        toast.success("Agent deleted.");

        if (page.url.pathname.includes(agentId)) {
          goto("/");
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
    <DropdownMenu.Item onclick={async () => await editClick()}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => deleteClick()}>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
