<script lang="ts">
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
  } from "$lib/components/ui/dropdown-menu";
  import { Input } from "$lib/components/ui/input";
  import type { ReasoningType } from "$lib/types/db";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import type { AIProvider } from "@prisma/client";

  interface ModelData {
    id: string;
    name: string;
    reasoningType: ReasoningType;
    deprecated: boolean;
  }

  interface ProviderGroup {
    provider: AIProvider;
    models: ModelData[];
    deprecatedModels: ModelData[];
  }

  interface Props {
    modelGroups: ProviderGroup[];
    selectedModelId?: string;
    onSelect: (modelId: string) => void;
  }

  let { modelGroups, selectedModelId = $bindable(), onSelect }: Props = $props();

  let searchQuery = $state("");
  let open = $state(false);

  // Find selected model details
  const selectedModel = $derived(() => {
    for (const group of modelGroups) {
      const model = [...group.models, ...group.deprecatedModels].find(
        (m) => m.id === selectedModelId
      );
      if (model) {
        return { ...model, provider: group.provider };
      }
    }
    return null;
  });

  // Filter models based on search query
  const filteredGroups = $derived(() => {
    if (!searchQuery.trim()) {
      return modelGroups;
    }

    const query = searchQuery.toLowerCase();
    return modelGroups
      .map((group) => ({
        ...group,
        models: group.models.filter((m) => m.name.toLowerCase().includes(query)),
        deprecatedModels: group.deprecatedModels.filter((m) => m.name.toLowerCase().includes(query))
      }))
      .filter((group) => group.models.length > 0 || group.deprecatedModels.length > 0);
  });

  function handleSelect(modelId: string) {
    selectedModelId = modelId;
    onSelect(modelId);
    open = false;
    searchQuery = "";
  }

  function formatProviderName(provider: AIProvider): string {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
</script>

<DropdownMenu bind:open>
  <DropdownMenuTrigger
    class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
  >
    {#if selectedModel()}
      {@const model = selectedModel()}
      <span class="truncate">
        {model?.name}
        {#if model?.deprecated}
          <span class="text-xs text-muted-foreground">(Deprecated)</span>
        {/if}
      </span>
    {:else}
      <span class="text-muted-foreground">Select model...</span>
    {/if}
    <ChevronDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
  </DropdownMenuTrigger>
  <DropdownMenuContent class="w-[400px]">
    <div class="p-2">
      <Input
        type="text"
        placeholder="Search models..."
        bind:value={searchQuery}
        class="h-8"
        autofocus
      />
    </div>
    <DropdownMenuSeparator />
    <div class="max-h-[400px] overflow-y-auto">
      {#if filteredGroups().length === 0}
        <div class="py-6 text-center text-sm text-muted-foreground">No models found</div>
      {:else}
        {#each filteredGroups() as group}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {formatProviderName(group.provider)}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent class="max-h-[300px] overflow-y-auto">
              {#each group.models as model}
                <DropdownMenuItem
                  onclick={() => handleSelect(model.id)}
                  class={selectedModelId === model.id ? "bg-accent" : ""}
                >
                  {model.name}
                </DropdownMenuItem>
              {/each}
              {#if group.deprecatedModels.length > 0}
                {#if group.models.length > 0}
                  <DropdownMenuSeparator />
                {/if}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger class="text-muted-foreground">
                    Deprecated
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent class="max-h-[200px] overflow-y-auto">
                    {#each group.deprecatedModels as model}
                      <DropdownMenuItem
                        onclick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        class={`cursor-not-allowed opacity-60 ${selectedModelId === model.id ? "bg-accent" : ""}`}
                        aria-disabled="true"
                      >
                        <span class="line-through">{model.name}</span>
                        <span class="ml-2 text-xs">(Deprecated)</span>
                      </DropdownMenuItem>
                    {/each}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              {/if}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        {/each}
      {/if}
    </div>
  </DropdownMenuContent>
</DropdownMenu>
