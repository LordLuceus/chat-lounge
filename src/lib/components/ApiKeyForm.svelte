<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import type { AIProvider } from "@prisma/client";
  import type { ActionData } from "../../routes/settings/$types";

  export let provider: AIProvider;
  export let form: ActionData;
  let apiKeyInput: Input;

  function handleApiKeyError() {
    apiKeyInput?.focus();
  }

  $: if (form?.message) {
    handleApiKeyError();
  }
</script>

<section>
  <form method="POST" action="/settings?/apiKey&provider={provider}" use:enhance>
    <Label>
      <span>API Key</span>
      <Input type="text" name="apiKey" bind:this={apiKeyInput} />
    </Label>
    {#if form?.message}
      <p role="alert">{form.message}</p>
    {/if}
    <Button type="submit">Save</Button>
  </form>
</section>
