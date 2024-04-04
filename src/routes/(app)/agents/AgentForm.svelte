<script lang="ts">
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { superForm, type Infer, type SuperValidated } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { formSchema, type FormSchema } from "./schema";

  export let data: SuperValidated<Infer<FormSchema>>;

  const form = superForm(data, {
    validators: zodClient(formSchema)
  });

  const { form: formData, enhance } = form;
</script>

<form method="POST" use:enhance>
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
  <Form.Button>Submit</Form.Button>
</form>
