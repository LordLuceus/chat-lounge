<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import type { Voice } from "$lib/types/elevenlabs/voices";
  import { Render, Subscribe, createRender, createTable } from "svelte-headless-table";
  import { writable } from "svelte/store";
  import DataTableActions from "./DataTableActions.svelte";
  import VoicePreviewButton from "./VoicePreviewButton.svelte";

  export let voices: Voice[];

  const voicesStore = writable(voices);

  $: voicesStore.set(voices);

  const table = createTable(voicesStore);

  const columns = table.createColumns([
    table.column({
      accessor: ({ name, preview_url }) => ({ name, preview_url }),
      header: "Name",
      cell: ({ value }) => {
        return createRender(VoicePreviewButton, {
          name: value.name,
          previewUrl: value.preview_url
        });
      }
    }),
    table.column({ accessor: "category", header: "Category" }),
    table.column({
      accessor: ({ voice_id, category }) => ({ voice_id, category }),
      header: "Actions",
      cell: ({ value }) => {
        return createRender(DataTableActions, { id: value.voice_id, category: value.category });
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
