<script lang="ts">
  interface Props {
    text: string;
  }

  const { text }: Props = $props();
</script>

<div role="alert">
  <p>{text}</p>
</div>
