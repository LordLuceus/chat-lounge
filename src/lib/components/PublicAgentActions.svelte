<script lang="ts">
  import { goto, preloadData } from "$app/navigation";
  import FolderSelectModal from "$lib/components/FolderSelectModal.svelte";
  import ForkAgentModal from "$lib/components/ForkAgentModal.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import type { Agent, Folder } from "@prisma/client";
  import type { PageData as EditData } from "../../routes/(app)/agents/[id]/edit/$types";
  import EditPage from "../../routes/(app)/agents/[id]/edit/+page.svelte";

  interface Props {
    agent: Agent;
  }

  const { agent }: Props = $props();

  let forkModalOpen = $state(false);
  let editDialogOpen = $state(false);
  let folderDialogOpen = $state(false);
  let editData: EditData | null = $state(null);

  function handleForkSuccess(forkedAgent: Agent) {
    const editUrl = `/agents/${forkedAgent.id}/edit`;
    preloadData(editUrl).then((result) => {
      if (result.type === "loaded" && result.status === 200) {
        editData = result.data as EditData;
        editDialogOpen = true;
      }
    });
  }

  function newConversationInFolderClick() {
    folderDialogOpen = true;
  }

  function handleFolderSelect(folder: Folder) {
    folderDialogOpen = false;
    goto(`/agents/${agent.id}?folderId=${folder.id}`);
  }
</script>

<Dialog.Root bind:open={editDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit agent</Dialog.Title>
    </Dialog.Header>
    {#if editData}
      <EditPage
        data={editData}
        closeDialog={() => (editDialogOpen = false)}
        action={`/agents/${editData.agent?.id}/edit`}
      />
    {/if}
  </Dialog.Content>
</Dialog.Root>

<ForkAgentModal
  {agent}
  open={forkModalOpen}
  onOpenChange={(open) => (forkModalOpen = open)}
  onForkSuccess={handleForkSuccess}
/>
<FolderSelectModal
  open={folderDialogOpen}
  title="Select Folder for New Conversation"
  description="Choose a folder where the new conversation with {name} will be automatically added."
  onFolderSelect={handleFolderSelect}
  onOpenChange={(open) => (folderDialogOpen = open)}
/>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props}>Actions</Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onclick={() => newConversationInFolderClick()}>
      New Conversation in Folder
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => (forkModalOpen = true)}>Fork Agent</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
