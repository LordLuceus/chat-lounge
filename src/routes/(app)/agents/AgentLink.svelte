<script lang="ts">
  export let agentId: string;
  export let agentName: string;
</script>

<a href={`/agents/${agentId}`}>{agentName}</a>
