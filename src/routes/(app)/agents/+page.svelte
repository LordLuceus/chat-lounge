<script lang="ts">
  import type { PageData } from "./$types";
  import AgentForm from "./AgentForm.svelte";

  export let data: PageData;
</script>

<svelte:head>
  <title>Agents | ChatLounge</title>
</svelte:head>

<AgentForm data={data.form} />
