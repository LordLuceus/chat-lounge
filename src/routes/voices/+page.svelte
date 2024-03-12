<script lang="ts">
  import DataTable from "./DataTable.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>Voices | ChatMate</title>
  <meta name="description" content="View and manage your ChatMate voices" />
</svelte:head>

<h1>Voices</h1>
<DataTable voices={data.voices} />
