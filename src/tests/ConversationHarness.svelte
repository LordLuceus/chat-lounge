<script lang="ts">
  // Renders the real Conversation page component inside a QueryClientProvider,
  // the way the app's root layout does (the provider also wires the client to
  // window focus and reconnect events).
  import Conversation from "$lib/components/Conversation.svelte";
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";

  interface Props {
    client?: QueryClient;
  }

  const { client = new QueryClient({ defaultOptions: { queries: { retry: false } } }) }: Props =
    $props();
</script>

<QueryClientProvider {client}>
  <Conversation />
</QueryClientProvider>
