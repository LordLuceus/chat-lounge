<script lang="ts">
  interface Props {
    text: string;
  }

  let { text }: Props = $props();
</script>

<div role="alert">
  <p>{text}</p>
</div>
