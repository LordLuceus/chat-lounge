<script lang="ts">
  import AgentForm from "../../AgentForm.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
  export let closeDialog: () => void = () => {};
  export let action: string = "";
</script>

<AgentForm data={data.editForm} {closeDialog} {action} />
