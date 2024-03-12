<script lang="ts">
  import { Render, Subscribe, createRender, createTable } from "svelte-headless-table";
  import { readable } from "svelte/store";
  import * as Table from "$lib/components/ui/table";
  import VoicePreviewButton from "./VoicePreviewButton.svelte";
  import DataTableActions from "./DataTableActions.svelte";
  import type { VoiceResponse } from "elevenlabs-edge/dist/api";

  export let voices: VoiceResponse[];

  const table = createTable(readable(voices));

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
      accessor: ({ voice_id }) => voice_id,
      header: "Actions",
      cell: ({ value }) => {
        return createRender(DataTableActions, { id: value });
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
