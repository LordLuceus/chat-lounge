<script lang="ts">
  import { run } from 'svelte/legacy';

  import { Button } from "$lib/components/ui/button";
  import * as Table from "$lib/components/ui/table";
  import type { Voice } from "$lib/types/elevenlabs";
  import { Render, Subscribe, createRender, createTable } from "svelte-headless-table";
  import { addPagination } from "svelte-headless-table/plugins";
  import { writable } from "svelte/store";
  import DataTableActions from "./DataTableActions.svelte";
  import VoicePreviewButton from "./VoicePreviewButton.svelte";

  interface Props {
    voices: Voice[];
  }

  let { voices }: Props = $props();

  const voicesStore = writable(voices);

  run(() => {
    voicesStore.set(voices);
  });

  const table = createTable(voicesStore, { page: addPagination({ initialPageSize: 20 }) });

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

  const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates } =
    table.createViewModel(columns);
  const { hasNextPage, hasPreviousPage, pageIndex } = pluginStates.page;
</script>

<div>
  <div class="rounded-md border">
    <Table.Root {...$tableAttrs}>
      <Table.Header>
        {#each $headerRows as headerRow}
          <Subscribe rowAttrs={headerRow.attrs()}>
            <Table.Row>
              {#each headerRow.cells as cell (cell.id)}
                <Subscribe attrs={cell.attrs()}  props={cell.props()}>
                  {#snippet children({ attrs })}
                                    <Table.Head {...attrs}>
                      <Render of={cell.render()} />
                    </Table.Head>
                                                    {/snippet}
                                </Subscribe>
              {/each}
            </Table.Row>
          </Subscribe>
        {/each}
      </Table.Header>
      <Table.Body {...$tableBodyAttrs}>
        {#each $pageRows as row (row.id)}
          <Subscribe rowAttrs={row.attrs()} >
            {#snippet children({ rowAttrs })}
                        <Table.Row {...rowAttrs}>
                {#each row.cells as cell (cell.id)}
                  <Subscribe attrs={cell.attrs()} >
                    {#snippet children({ attrs })}
                                    <Table.Cell {...attrs}>
                        <Render of={cell.render()} />
                      </Table.Cell>
                                                      {/snippet}
                                </Subscribe>
                {/each}
              </Table.Row>
                                  {/snippet}
                    </Subscribe>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
  <div class="flex items-center justify-end space-x-4 py-4">
    <Button
      variant="outline"
      size="sm"
      on:click={() => ($pageIndex = $pageIndex - 1)}
      disabled={!$hasPreviousPage}>Previous</Button
    >
    <Button
      variant="outline"
      size="sm"
      disabled={!$hasNextPage}
      on:click={() => ($pageIndex = $pageIndex + 1)}>Next</Button
    >
  </div>
</div>
