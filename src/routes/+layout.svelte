<script lang="ts">
  import { browser } from "$app/environment";
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
  import { ModeWatcher } from "mode-watcher";
  import "../app.pcss";

  const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: browser } } });
</script>

<QueryClientProvider client={queryClient}>
  <slot />
</QueryClientProvider>

<ModeWatcher />
