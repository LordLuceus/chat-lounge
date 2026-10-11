<script lang="ts">
  // Stand-in for svelte-clerk's <Show>: tests always run as a signed-in user.
  import type { Snippet } from "svelte";

  interface Props {
    when?: unknown;
    children?: Snippet;
    fallback?: Snippet;
  }

  const { children }: Props = $props();
</script>

{@render children?.()}
