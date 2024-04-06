<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { Render, Subscribe, createRender, createTable } from "svelte-headless-table";
  import { writable } from "svelte/store";
  import AgentActions from "./AgentActions.svelte";
  import AgentLink from "./AgentLink.svelte";

  export let agents: {
    id: string;
    name: string;
    description: string | null;
    instructions: string;
    createdAt: Date;
    updatedAt: Date;
    lastUsedAt: Date | null;
  }[];

  const agentsStore = writable(agents);

  $: agentsStore.set(agents);

  const table = createTable(agentsStore);

  const columns = table.createColumns([
    table.column({
      accessor: ({ id, name }) => ({ id, name }),
      header: "Name",
      cell: ({ value }) => {
        return createRender(AgentLink, { agentId: value.id, agentName: value.name });
      }
    }),
    table.column({
      accessor: "description",
      header: "Description",
      cell: ({ value }) => (value ? value : "")
    }),
    table.column({
      accessor: "id",
      header: "Actions",
      cell: ({ value }) => {
        return createRender(AgentActions, {
          clickText: "Actions",
          agentId: value
        });
      }
    })
  ]);

  const { headerRows, pageRows, tableAttrs, tableBodyAttrs } = table.createViewModel(columns);
</script>

<div class="rounded-md border">
  <Table.Root {...$tableAttrs}>
    <Table.Header>
      {#each $headerRows as headerRow}
        <Subscribe rowAttrs={headerRow.attrs()}>
          <Table.Row>
            {#each headerRow.cells as cell (cell.id)}
              <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()}>
                <Table.Head {...attrs}>
                  <Render of={cell.render()} />
                </Table.Head>
              </Subscribe>
            {/each}
          </Table.Row>
        </Subscribe>
      {/each}
    </Table.Header>
    <Table.Body {...$tableBodyAttrs}>
      {#each $pageRows as row (row.id)}
        <Subscribe rowAttrs={row.attrs()} let:rowAttrs>
          <Table.Row {...rowAttrs}>
            {#each row.cells as cell (cell.id)}
              <Subscribe attrs={cell.attrs()} let:attrs>
                <Table.Cell {...attrs}>
                  <Render of={cell.render()} />
                </Table.Cell>
              </Subscribe>
            {/each}
          </Table.Row>
        </Subscribe>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
