<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Textarea } from "$lib/components/ui/textarea";
  import { ariaListOpen } from "$lib/helpers";
  import { AgentType } from "$lib/types/db";
  import { useQueryClient } from "@tanstack/svelte-query";
  import Select from "svelte-select";
  import { superForm, type Infer, type SuperValidated } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { agentSchema, type AgentSchema } from "./schema";

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
  let verbosityValue = $state($formData.verbosity ?? undefined);

  // Update formData when verbosityValue changes
  $effect(() => {
    $formData.verbosity = verbosityValue;
  });

  async function fetchModels(searchText?: string) {
    const response = await fetch(`/api/models?search=${encodeURIComponent(searchText ?? "")}`);
    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }
    return response.json();
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
        <Select
          {...props}
          bind:value={$formData.preferredModel}
          loadOptions={fetchModels}
          placeholder="Select a model"
          {ariaListOpen}
          clearable={true}
        />
      {/snippet}
    </Form.Control>
    <Form.Description>
      Choose a default model for this agent. This will be used when no specific model is selected.
    </Form.Description>
    <Form.FieldErrors />
  </Form.Fieldset>

  <Form.Button>Save</Form.Button>
</form>
