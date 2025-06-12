<script lang="ts">
  import { run } from 'svelte/legacy';

  import Toast from "$lib/components/Toast.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { useQueryClient } from "@tanstack/svelte-query";
  import MoreHorizontal from "lucide-svelte/icons/more-horizontal";
  import { toast } from "svelte-sonner";

  interface Props {
    id: string;
    category: string;
  }

  let { id, category }: Props = $props();

  let copyIdSuccess = $state(false);
  let deleteSuccess = $state(false);
  let deleteError = $state(false);
  let deleteDialogOpen = $state(false);

  const client = useQueryClient();

  async function copyId() {
    await navigator.clipboard.writeText(id);
    copyIdSuccess = true;
  }

  async function deleteVoice() {
    try {
      const res = await fetch(`/api/voices/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        deleteError = true;
      }

      deleteSuccess = true;
      client.invalidateQueries({ queryKey: ["voices"] });
    } catch (error) {
      deleteError = true;
    }
  }

  run(() => {
    if (copyIdSuccess) {
      toast.success(Toast, { componentProps: { text: "Voice ID copied to clipboard." } });
      copyIdSuccess = false;
    }

    if (deleteSuccess) {
      toast.success(Toast, { componentProps: { text: "Voice deleted." } });
      deleteSuccess = false;
    }

    if (deleteError) {
      toast.error(Toast, { componentProps: { text: "Failed to delete voice." } });
      deleteError = false;
    }
  });
</script>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This will permanently delete the voice. You can't undo this action.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action on:click={deleteVoice}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild >
    {#snippet children({ builder })}
        <Button variant="ghost" builders={[builder]} size="icon" class="relative h-8 w-8 p-0">
        <span class="sr-only">Actions</span>
        <MoreHorizontal class="h-4 w-4" />
      </Button>
          {/snippet}
    </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Actions</DropdownMenu.Label>
      {#if category !== "premade"}
        <DropdownMenu.Item on:click={() => (deleteDialogOpen = true)}
          >Delete voice</DropdownMenu.Item
        >
      {/if}
      <DropdownMenu.Item on:click={copyId}>Copy voice ID</DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
