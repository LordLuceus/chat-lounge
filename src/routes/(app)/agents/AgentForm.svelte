<script lang="ts">
  import { goto } from "$app/navigation";
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
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Textarea } from "$lib/components/ui/textarea";
  import { AgentType, AgentVerbosity, ReasoningType } from "$lib/types/db";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import X from "@lucide/svelte/icons/x";
  import type { AIProvider } from "@prisma/client";
  import { useQueryClient } from "@tanstack/svelte-query";
  import { onMount } from "svelte";
  import { superForm, type Infer, type SuperValidated } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { agentSchema, type AgentSchema } from "./schema";

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
    data: SuperValidated<Infer<AgentSchema>>;
    closeDialog?: () => void;
    action?: string;
  }

  const { data, closeDialog = () => {}, action = "" }: Props = $props();

  const client = useQueryClient();

  const form = superForm(data, {
    validators: zodClient(agentSchema),
    dataType: "json",
    onUpdated: ({ form }) => {
      if (form.valid) {
        closeDialog();
        client.invalidateQueries({ queryKey: ["agents"] });

        if (form.message.created && form.message.agentId) {
          goto(`/agents/${form.message.agentId}`);
        }
      }
    }
  });

  const { form: formData, enhance } = form;

  // Handle verbosity value for RadioGroup compatibility
  let verbosityValue = $state($formData.verbosity ?? AgentVerbosity.Default);

  // Update formData when verbosityValue changes
  $effect(() => {
    $formData.verbosity = verbosityValue;
  });

  let modelGroups = $state<ProviderGroup[]>([]);
  let searchQuery = $state("");
  let dropdownOpen = $state(false);

  // Fetch model groups
  async function fetchModelGroups() {
    const response = await fetch("/api/models/grouped");
    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }
    modelGroups = await response.json();
  }

  onMount(() => {
    fetchModelGroups();
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

  // Find selected model details
  const selectedModel = $derived(() => {
    const modelId = $formData.preferredModel?.value;
    if (!modelId) return null;

    for (const group of modelGroups) {
      const model = [...group.models, ...group.deprecatedModels].find((m) => m.id === modelId);
      if (model) {
        return { ...model, provider: group.provider };
      }
    }
    return null;
  });

  function handleSelectModel(modelId: string, modelName: string) {
    $formData.preferredModel = { value: modelId, label: modelName };
    dropdownOpen = false;
    searchQuery = "";
  }

  function clearModel() {
    $formData.preferredModel = null;
  }

  function formatProviderName(provider: AIProvider): string {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
</script>

<form method="POST" use:enhance {action}>
  <Form.Fieldset {form} name="type">
    <Form.Legend>Agent Type</Form.Legend>
    <RadioGroup.Root bind:value={$formData.type} class="flex flex-col space-y-3" name="type">
      <div class="flex items-start space-x-3 space-y-0">
        <Form.Control>
          {#snippet children({ props })}
            <RadioGroup.Item value="default" {...props} class="mt-1" />
            <div class="flex flex-col">
              <Form.Label class="font-normal">Default</Form.Label>
              <p class="text-sm text-muted-foreground">
                A standard agent with a custom system prompt. Best for task-oriented interactions
                and general assistance.
              </p>
            </div>
          {/snippet}
        </Form.Control>
      </div>
      <div class="flex items-start space-x-3 space-y-0">
        <Form.Control>
          {#snippet children({ props })}
            <RadioGroup.Item value="character" {...props} class="mt-1" />
            <div class="flex flex-col">
              <Form.Label class="font-normal">Character</Form.Label>
              <p class="text-sm text-muted-foreground">
                A character card designed for immersive roleplay. Uses <code>{`{{char}}`}</code> and
                <code>{`{{user}}`}</code> placeholders in instructions and supports custom greeting messages.
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                Need help? Try the <a
                  href="/agents/0f063ee3-7616-4d6e-b25e-dbd58c745453"
                  class="text-blue-600 underline hover:text-blue-800"
                  target="_blank">Character Designer</a
                > agent to create robust character cards based on your concept.
              </p>
            </div>
          {/snippet}
        </Form.Control>
      </div>
    </RadioGroup.Root>
    <Form.FieldErrors />
  </Form.Fieldset>
  <Form.Field {form} name="name">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Name</Form.Label>
        <Input {...props} bind:value={$formData.name} />
      {/snippet}
    </Form.Control>
    <Form.Description>Give your agent a memorable name.</Form.Description>
    <Form.FieldErrors />
  </Form.Field>
  <Form.Field {form} name="description">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Description</Form.Label>
        <Input {...props} bind:value={$formData.description} />
      {/snippet}
    </Form.Control>
    <Form.Description>A brief description of what the agent does.</Form.Description>
    <Form.FieldErrors />
  </Form.Field>
  <Form.Field {form} name="instructions">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Instructions</Form.Label>
        <Textarea {...props} bind:value={$formData.instructions} />
      {/snippet}
    </Form.Control>
    <Form.Description>
      What does this agent do? How does it behave? What should it avoid doing?
      {#if $formData.type === AgentType.Character}
        <br /><strong>Character placeholders:</strong> Use <code>{`{{char}}`}</code> for the
        character name and <code>{`{{user}}`}</code> for the user's name.
      {/if}
    </Form.Description>
    <Form.FieldErrors />
  </Form.Field>
  {#if $formData.type === AgentType.Character}
    <Form.Fieldset {form} name="verbosity">
      <Form.Legend>Response Style</Form.Legend>
      <RadioGroup.Root bind:value={verbosityValue} class="flex flex-col space-y-3" name="verbosity">
        <div class="flex items-start space-x-3 space-y-0">
          <Form.Control>
            {#snippet children({ props })}
              <RadioGroup.Item value="concise" {...props} class="mt-1" />
              <div class="flex flex-col">
                <Form.Label class="font-normal">Concise</Form.Label>
                <p class="text-sm text-muted-foreground">
                  Keep responses short (~200 words), focused, and allow space for user interaction.
                </p>
              </div>
            {/snippet}
          </Form.Control>
        </div>
        <div class="flex items-start space-x-3 space-y-0">
          <Form.Control>
            {#snippet children({ props })}
              <RadioGroup.Item value="default" {...props} class="mt-1" />
              <div class="flex flex-col">
                <Form.Label class="font-normal">Default</Form.Label>
                <p class="text-sm text-muted-foreground">
                  Standard response length with no specific verbosity constraints.
                </p>
              </div>
            {/snippet}
          </Form.Control>
        </div>
        <div class="flex items-start space-x-3 space-y-0">
          <Form.Control>
            {#snippet children({ props })}
              <RadioGroup.Item value="verbose" {...props} class="mt-1" />
              <div class="flex flex-col">
                <Form.Label class="font-normal">Verbose</Form.Label>
                <p class="text-sm text-muted-foreground">
                  Detailed, comprehensive responses that fully explore thoughts, emotions, and
                  scenes.
                </p>
              </div>
            {/snippet}
          </Form.Control>
        </div>
      </RadioGroup.Root>
      <Form.FieldErrors />
    </Form.Fieldset>
    <Form.Field {form} name="greeting">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Greeting</Form.Label>
          <Textarea {...props} bind:value={$formData.greeting} />
        {/snippet}
      </Form.Control>
      <Form.Description>The character's first message when starting a new chat.</Form.Description>
      <Form.FieldErrors />
    </Form.Field>
  {/if}
  <Form.Fieldset {form} name="visibility">
    <Form.Legend>Visibility</Form.Legend>
    <RadioGroup.Root
      bind:value={$formData.visibility}
      class="flex flex-col space-y-1"
      name="visibility"
    >
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control>
          {#snippet children({ props })}
            <RadioGroup.Item value="public" {...props} />
            <Form.Label class="font-normal">Public</Form.Label>
          {/snippet}
        </Form.Control>
      </div>
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control>
          {#snippet children({ props })}
            <RadioGroup.Item value="private" {...props} />
            <Form.Label class="font-normal">Private</Form.Label>
          {/snippet}
        </Form.Control>
      </div>
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control>
          {#snippet children({ props })}
            <RadioGroup.Item value="hidden" {...props} />
            <Form.Label class="font-normal">Link only</Form.Label>
          {/snippet}
        </Form.Control>
      </div>
    </RadioGroup.Root>
    <Form.FieldErrors />
  </Form.Fieldset>
  <Form.Fieldset {form} name="preferredModel">
    <Form.Legend>Preferred Model</Form.Legend>
    <Form.Control>
      {#snippet children({ props })}
        <div {...props} class="relative">
          <DropdownMenu bind:open={dropdownOpen}>
            <DropdownMenuTrigger
              class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
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
                <span class="text-muted-foreground">Select a model (optional)</span>
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
                            onclick={() => handleSelectModel(model.id, model.name)}
                            class={$formData.preferredModel?.value === model.id ? "bg-accent" : ""}
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
                                  class={`cursor-not-allowed opacity-60 ${$formData.preferredModel?.value === model.id ? "bg-accent" : ""}`}
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
          {#if $formData.preferredModel}
            <button
              type="button"
              onclick={clearModel}
              class="absolute right-8 top-1/2 -translate-y-1/2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
              aria-label="Clear model selection"
            >
              <X class="h-4 w-4" />
            </button>
          {/if}
        </div>
      {/snippet}
    </Form.Control>
    <Form.Description>
      Choose a default model for this agent. This will be used when no specific model is selected.
    </Form.Description>
    <Form.FieldErrors />
  </Form.Fieldset>

  <Form.Button>Save</Form.Button>
</form>
