<script lang="ts">
  import { preloadData } from "$app/navigation";
  import ForkAgentModal from "$lib/components/ForkAgentModal.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import type { Agent } from "@prisma/client";
  import type { PageData as EditData } from "../../routes/(app)/agents/[id]/edit/$types";
  import EditPage from "../../routes/(app)/agents/[id]/edit/+page.svelte";

  interface Props {
    agent: Agent;
  }

  const { agent }: Props = $props();

  let forkModalOpen = $state(false);
  let editDialogOpen = $state(false);
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

<Button onclick={() => (forkModalOpen = true)}>Fork Agent</Button>
