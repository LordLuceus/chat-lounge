<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";
  import { useQueryClient } from "@tanstack/svelte-query";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    id: string;
    category: string;
  }

  const { id, category }: Props = $props();

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

  $effect(() => {
    if (copyIdSuccess) {
      toast.success("Voice ID copied to clipboard.");
      copyIdSuccess = false;
    }

    if (deleteSuccess) {
      toast.success("Voice deleted.");
      deleteSuccess = false;
    }

    if (deleteError) {
      toast.error("Failed to delete voice.");
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
      <AlertDialog.Action onclick={deleteVoice}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button variant="ghost" {...props} size="icon" class="relative h-8 w-8 p-0">
        <span class="sr-only">Actions</span>
        <MoreHorizontal class="h-4 w-4" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Actions</DropdownMenu.Label>
      {#if category !== "premade"}
        <DropdownMenu.Item
          onclick={async () => {
            await tick();
            deleteDialogOpen = true;
          }}>Delete voice</DropdownMenu.Item
        >
      {/if}
      <DropdownMenu.Item onclick={copyId}>Copy voice ID</DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
