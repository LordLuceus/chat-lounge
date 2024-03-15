<script lang="ts">
  import MoreHorizontal from "lucide-svelte/icons/more-horizontal";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { toast } from "svelte-sonner";
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";

  export let id: string;
  export let category: string;

  let setDefaultError = false;
  let setDefaultSuccess = false;
  let copyIdSuccess = false;
  let deleteSuccess = false;
  let deleteError = false;
  let deleteDialogOpen = false;

  async function setDefault() {
    try {
      const res = await fetch(`/api/settings/${$page.data.session?.user?.id}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ voiceId: id })
      });

      if (!res.ok) {
        setDefaultError = true;
      }

      setDefaultSuccess = true;
    } catch (error) {
      setDefaultError = true;
    }
  }

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
      await invalidateAll();
    } catch (error) {
      deleteError = true;
    }
  }

  $: {
    if (setDefaultSuccess) {
      toast.success("Voice set as default");
      setDefaultSuccess = false;
    }

    if (setDefaultError) {
      toast.error("Failed to set voice as default");
      setDefaultError = false;
    }

    if (copyIdSuccess) {
      toast.success("Voice ID copied to clipboard");
      copyIdSuccess = false;
    }

    if (deleteSuccess) {
      toast.success("Voice deleted");
      deleteSuccess = false;
    }

    if (deleteError) {
      toast.error("Failed to delete voice");
      deleteError = false;
    }
  }
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
  <DropdownMenu.Trigger asChild let:builder>
    <Button variant="ghost" builders={[builder]} size="icon" class="relative h-8 w-8 p-0">
      <span class="sr-only">Actions</span>
      <MoreHorizontal class="h-4 w-4" />
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Actions</DropdownMenu.Label>
      <DropdownMenu.Item on:click={setDefault}>Set as default</DropdownMenu.Item>
      {#if category !== "premade"}
        <DropdownMenu.Item on:click={() => (deleteDialogOpen = true)}
          >Delete voice</DropdownMenu.Item
        >
      {/if}
      <DropdownMenu.Item on:click={copyId}>Copy voice ID</DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
