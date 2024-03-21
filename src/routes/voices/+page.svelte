<script lang="ts">
  import type { PageData } from "./$types";
  import DataTable from "./DataTable.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>Voices | ChatMate</title>
  <meta name="description" content="View and manage your ChatMate voices" />
</svelte:head>

<h1>Voices</h1>
<DataTable voices={data.voices} />
