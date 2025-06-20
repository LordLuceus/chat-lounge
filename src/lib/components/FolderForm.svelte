<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { useQueryClient } from "@tanstack/svelte-query";
  import { superForm, type Infer, type SuperValidated } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { folderSchema, type FolderSchema } from "../../routes/(app)/folders/schema";

  interface Props {
    data: SuperValidated<Infer<FolderSchema>>;
    closeDialog?: () => void;
    action?: string;
  }

  const { data, closeDialog = () => {}, action = "" }: Props = $props();

  const client = useQueryClient();

  const form = superForm(data, {
    validators: zodClient(folderSchema),
    onUpdated: ({ form }) => {
      if (form.valid) {
        closeDialog();
        client.invalidateQueries({ queryKey: ["folders"] });

        if (form.message.created && form.message.folderId) {
          goto(`/folders/${form.message.folderId}`);
        }
      }
    }
  });

  const { form: formData, enhance } = form;
</script>

<form method="POST" use:enhance {action}>
  <Form.Field {form} name="name">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Name</Form.Label>
        <Input {...props} bind:value={$formData.name} />
      {/snippet}
    </Form.Control>
    <Form.Description>The name of this folder</Form.Description>
    <Form.FieldErrors />
  </Form.Field>
  <Form.Button>Save</Form.Button>
</form>
