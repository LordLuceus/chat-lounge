<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { createQuery, useQueryClient } from "@tanstack/svelte-query";
  import type { PageData } from "./$types";
  import AgentForm from "./AgentForm.svelte";
  import DataTable from "./DataTable.svelte";

  export let data: PageData;

  const client = useQueryClient();

  const agentsQuery = createQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const response = await fetch("/api/agents");
      return response.json();
    },
    initialData: data.agents
  });
</script>

<svelte:head>
  <title>Agents | ChatLounge</title>
</svelte:head>

<h1>Agents</h1>

<Dialog.Root>
  <Dialog.Trigger>Create agent</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Create a new agent</Dialog.Title>
    </Dialog.Header>
    <AgentForm data={data.form} />
  </Dialog.Content>
</Dialog.Root>

{#if $agentsQuery.data?.length > 0}
  <DataTable agents={$agentsQuery.data} />
{:else}
  <p>No agents to display. Try creating an agent.</p>
{/if}
