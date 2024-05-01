<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
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
  <Form.Button>Save</Form.Button>
</form>
