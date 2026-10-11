<script lang="ts">
  // Renders the Chat component inside a QueryClientProvider, as the pages do.
  import Chat from "$lib/components/Chat.svelte";
  import type { DBMessage } from "$lib/types/db";
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";

  interface Props {
    initialMessages?: DBMessage[];
    selectedModelId?: string;
    agent?: { id: string; name: string };
  }

  const { initialMessages, selectedModelId = "model-1", agent }: Props = $props();

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const modelGroups = [
    {
      provider: "openai" as const,
      models: [
        {
          id: "model-1",
          name: "Test Model",
          reasoningType: "none" as never,
          deprecated: false,
          supportsImages: true,
          supportsVideo: false
        }
      ],
      deprecatedModels: []
    }
  ];
</script>

<QueryClientProvider {client}>
  <Chat apiKeys={{}} {modelGroups} {initialMessages} {selectedModelId} {agent} />
</QueryClientProvider>
