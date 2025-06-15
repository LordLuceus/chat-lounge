<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    fetchMore: () => void;
    hasMore: boolean;
    children?: import("svelte").Snippet;
  }

  const { fetchMore, hasMore, children }: Props = $props();

  let loading: boolean = false;
  let scrollContainer: HTMLElement = $state()!;

  const onScroll = async () => {
    if (scrollContainer) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (!loading && scrollHeight - scrollTop <= clientHeight * 1.5) {
        if (hasMore) {
          loading = true;
          await fetchMore();
          loading = false;
        }
      }
    }
  };

  onMount(() => {
    scrollContainer.addEventListener("scroll", onScroll);
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  });
</script>

<div bind:this={scrollContainer} class="h-96 overflow-y-auto">
  {@render children?.()}
</div>
