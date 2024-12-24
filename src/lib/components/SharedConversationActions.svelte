<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Toast from "$lib/components/Toast.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { toast } from "svelte-sonner";

  export let id: string;
  export let name: string;

  const client = useQueryClient();

  const deleteConversationMutation = createMutation({
    mutationFn: async (id: string) =>
      (
        await fetch(`/api/conversations/shared/${id}`, {
          method: "DELETE"
        })
      ).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["sharedConversations"], exact: true });
      client.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "sharedConversations" && query.queryKey[1] !== id
      });
      client.invalidateQueries({ queryKey: ["conversations"], exact: true });
    }
  });

  let deleteDialogOpen = false;

  function deleteClick() {
    deleteDialogOpen = true;
  }

  function handleDelete(conversationId: string) {
    $deleteConversationMutation.mutate(conversationId, {
      onSuccess: () => {
        deleteDialogOpen = false;
        toast.success(Toast, { componentProps: { text: "Conversation unshared successfully." } });

        if ($page.url.pathname.includes(conversationId)) {
          goto("/");
        }
      }
    });
  }

  function handleCopyShareLink() {
    const url = `${window.location.origin}/conversations/shared/${id}`;
    navigator.clipboard.writeText(url);
    toast.success(Toast, {
      componentProps: { text: "Link copied to clipboard." }
    });
  }
</script>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Unshare conversation</AlertDialog.Title>
      <AlertDialog.Description
        >Are you sure you want to stop sharing {name}?</AlertDialog.Description
      >
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action on:click={() => handleDelete(id)}>Unshare</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item on:click={handleCopyShareLink}>Copy share link</DropdownMenu.Item>
    <DropdownMenu.Item on:click={deleteClick}>Unshare</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
