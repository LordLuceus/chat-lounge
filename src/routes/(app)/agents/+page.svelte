<script lang="ts">
  import SuperDebug from "sveltekit-superforms";
  import type { PageData } from "./$types";
  import AgentForm from "./AgentForm.svelte";

  export let data: PageData;
  export let form;
</script>

<svelte:head>
  <title>Agents | ChatLounge</title>
</svelte:head>

<AgentForm data={data.form} />

<SuperDebug data={form} />
