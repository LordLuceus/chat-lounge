<script lang="ts">
  import { browser } from "$app/environment";
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
  import { ModeWatcher } from "mode-watcher";
  import { ClerkProvider } from "svelte-clerk";
  import "../app.pcss";

  interface Props {
    children?: import("svelte").Snippet;
  }

  const { children }: Props = $props();

  const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: browser } } });
</script>

<ClerkProvider>
  <QueryClientProvider client={queryClient}>
    {@render children?.()}
  </QueryClientProvider>
</ClerkProvider>

<ModeWatcher />
