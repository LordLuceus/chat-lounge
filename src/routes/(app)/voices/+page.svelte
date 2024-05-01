<script lang="ts">
  import { voices } from "$lib/stores/voices-store";
  import { Loader } from "lucide-svelte";
  import DataTable from "./DataTable.svelte";
</script>

<svelte:head>
  <title>Voices | ChatLounge</title>
  <meta name="description" content="View and manage your ChatLounge voices" />
</svelte:head>

<h1>Voices</h1>
{#if $voices}
  <DataTable voices={$voices} />
{:else}
  <Loader />
{/if}
