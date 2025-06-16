<script lang="ts">
  import gettingStarted from "$lib/data/getting-started.md?raw";
  import { lineBreaksPlugin } from "$lib/line-breaks-plugin";
  import Markdown from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";

  const plugins = [gfmPlugin(), lineBreaksPlugin];
</script>

<svelte:head>
  <title>Getting Started | ChatLounge</title>
  <meta name="description" content="Get started with ChatLounge" />
</svelte:head>

<Markdown md={gettingStarted} {plugins} />
