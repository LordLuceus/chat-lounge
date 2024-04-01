<script lang="ts">
  import type { PageData } from "./$types";
  import DataTable from "./DataTable.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>Voices | ChatLounge</title>
  <meta name="description" content="View and manage your ChatLounge voices" />
</svelte:head>

<h1>Voices</h1>
{#if data.voices}
  <DataTable voices={data.voices} />
{/if}
