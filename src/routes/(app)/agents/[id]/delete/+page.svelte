<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { superForm } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { deleteSchema } from "../../schema";
  import type { PageData } from "./$types";

  export let data: PageData;
  export let action: string = "";

  const form = superForm(data?.deleteForm, {
    validators: zodClient(deleteSchema)
  });

  const { form: formData, enhance } = form;
</script>

<form method="post" use:enhance {action}>
  <input type="hidden" name="id" value={data.agent.id} />
  <Button type="submit">Delete</Button>
</form>
