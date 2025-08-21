<script lang="ts">
  import changelog from "$lib/data/changelog.md?raw";
  import { lineBreaksPlugin } from "$lib/line-breaks-plugin";
  import Markdown from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";

  const plugins = [gfmPlugin(), lineBreaksPlugin];
</script>

<svelte:head>
  <title>Changelog | ChatLounge</title>
  <meta name="description" content="Changelog for ChatLounge" />
</svelte:head>

<Markdown md={changelog} {plugins} />
