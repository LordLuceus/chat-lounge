<script lang="ts">
  import { onMount } from "svelte";

  // Props
  export let fetchMore: () => void;
  export let hasMore: boolean;

  let loading: boolean = false;
  let scrollContainer: HTMLElement;

  const onScroll = async () => {
    if (scrollContainer) {
      // Calculate when to trigger fetching more data
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

  // Attaching the scroll event listener to the container
  onMount(() => {
    scrollContainer.addEventListener("scroll", onScroll);
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  });
</script>

<div bind:this={scrollContainer} class="h-96 overflow-y-auto">
  <slot />
</div>
