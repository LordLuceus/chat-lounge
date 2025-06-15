<script lang="ts">
  import AgentForm from "../../AgentForm.svelte";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
    closeDialog?: () => void;
    action?: string;
  }

  const { data, closeDialog = () => {}, action = "" }: Props = $props();
</script>

<AgentForm data={data.editForm} {closeDialog} {action} />
