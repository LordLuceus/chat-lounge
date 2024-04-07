<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import type { PageData } from "./$types";
  import AgentForm from "./AgentForm.svelte";
  import DataTable from "./DataTable.svelte";

  export let data: PageData;
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

{#if data.agents.length > 0}
  <DataTable agents={data.agents} />
{:else}
  <p>No agents to display. Try creating an agent.</p>
{/if}
