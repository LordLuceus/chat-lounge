<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { AIProvider } from "$lib/types/db";
  import type { ActionData } from "./$types";

  interface Props {
    provider: AIProvider;
    openText: string;
    form: ActionData;
  }

  const { provider, openText, form }: Props = $props();
  let apiKeyInput: HTMLElement | null = $state(null);
  let open = $state(false);

  function handleApiKeyError() {
    apiKeyInput?.focus();
  }

  $effect(() => {
    if (form?.message) {
      handleApiKeyError();
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>{openText}</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Set your {provider} API key</Dialog.Title>
    </Dialog.Header>
    <section>
      <form
        method="POST"
        action="?/apiKey&provider={provider}"
        use:enhance={() => {
          open = false;
        }}
      >
        <Label>
          <span>API Key</span>
          <Input type="text" name="apiKey" ref={apiKeyInput} required />
        </Label>
        {#if form?.message}
          <p role="alert">{form.message}</p>
        {/if}
        <Button type="submit">Save</Button>
      </form>
    </section>
  </Dialog.Content>
</Dialog.Root>
