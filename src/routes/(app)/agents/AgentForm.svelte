<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Textarea } from "$lib/components/ui/textarea";
  import { AgentType } from "$lib/types/db";
  import { useQueryClient } from "@tanstack/svelte-query";
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
</script>

<form method="POST" use:enhance {action}>
  <Form.Fieldset {form} name="type">
    <Form.Legend>Agent Type</Form.Legend>
    <RadioGroup.Root bind:value={$formData.type} class="flex flex-col space-y-1" name="type">
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control>
          {#snippet children({ props })}
            <RadioGroup.Item value="default" {...props} />
            <Form.Label class="font-normal">Default</Form.Label>
          {/snippet}
        </Form.Control>
      </div>
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control>
          {#snippet children({ props })}
            <RadioGroup.Item value="character" {...props} />
            <Form.Label class="font-normal">Character</Form.Label>
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
    <Form.Description
      >What does this agent do? How does it behave? What should it avoid doing?</Form.Description
    >
    <Form.FieldErrors />
  </Form.Field>
  {#if $formData.type === AgentType.Character}
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

  <Form.Button>Save</Form.Button>
</form>
