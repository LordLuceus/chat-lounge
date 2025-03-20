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

  export let data: SuperValidated<Infer<AgentSchema>>;
  export let closeDialog: () => void = () => {};
  export let action: string = "";

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
    <RadioGroup.Root bind:value={$formData.type} class="flex flex-col space-y-1">
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control let:attrs>
          <RadioGroup.Item value="default" {...attrs} />
          <Form.Label class="font-normal">Default</Form.Label>
        </Form.Control>
      </div>
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control let:attrs>
          <RadioGroup.Item value="character" {...attrs} />
          <Form.Label class="font-normal">Character</Form.Label>
        </Form.Control>
      </div>
      <RadioGroup.Input name="type" />
    </RadioGroup.Root>
    <Form.FieldErrors />
  </Form.Fieldset>
  <Form.Field {form} name="name">
    <Form.Control let:attrs>
      <Form.Label>Name</Form.Label>
      <Input {...attrs} bind:value={$formData.name} />
    </Form.Control>
    <Form.Description>Give your agent a memorable name.</Form.Description>
    <Form.FieldErrors />
  </Form.Field>
  <Form.Field {form} name="description">
    <Form.Control let:attrs>
      <Form.Label>Description</Form.Label>
      <Input {...attrs} bind:value={$formData.description} />
    </Form.Control>
    <Form.Description>A brief description of what the agent does.</Form.Description>
    <Form.FieldErrors />
  </Form.Field>
  <Form.Field {form} name="instructions">
    <Form.Control let:attrs>
      <Form.Label>Instructions</Form.Label>
      <Textarea {...attrs} bind:value={$formData.instructions} />
    </Form.Control>
    <Form.Description
      >What does this agent do? How does it behave? What should it avoid doing?</Form.Description
    >
    <Form.FieldErrors />
  </Form.Field>
  {#if $formData.type === AgentType.Character}
    <Form.Field {form} name="greeting">
      <Form.Control let:attrs>
        <Form.Label>Greeting</Form.Label>
        <Textarea {...attrs} bind:value={$formData.greeting} />
      </Form.Control>
      <Form.Description>The character's first message when starting a new chat.</Form.Description>
      <Form.FieldErrors />
    </Form.Field>
  {/if}
  <Form.Fieldset {form} name="visibility">
    <Form.Legend>Visibility</Form.Legend>
    <RadioGroup.Root bind:value={$formData.visibility} class="flex flex-col space-y-1">
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control let:attrs>
          <RadioGroup.Item value="public" {...attrs} />
          <Form.Label class="font-normal">Public</Form.Label>
        </Form.Control>
      </div>
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control let:attrs>
          <RadioGroup.Item value="private" {...attrs} />
          <Form.Label class="font-normal">Private</Form.Label>
        </Form.Control>
      </div>
      <div class="flex items-center space-x-3 space-y-0">
        <Form.Control let:attrs>
          <RadioGroup.Item value="hidden" {...attrs} />
          <Form.Label class="font-normal">Link only</Form.Label>
        </Form.Control>
      </div>
      <RadioGroup.Input name="visibility" />
    </RadioGroup.Root>
    <Form.FieldErrors />
  </Form.Fieldset>

  <Form.Button>Save</Form.Button>
</form>
