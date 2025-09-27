<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { ariaListOpen } from "$lib/helpers";
  import { ALL_PROVIDERS } from "$lib/helpers/api-key-utils";
  import { PROVIDER_METADATA } from "$lib/helpers/provider-metadata";
  import Select from "svelte-select";
  import type { ActionData } from "../../routes/(app)/settings/$types";

  interface Props {
    keys: Record<string, boolean>;
    form: ActionData;
  }

  const { keys, form }: Props = $props();

  const providerOptions = ALL_PROVIDERS.map((provider) => ({
    value: provider,
    label: PROVIDER_METADATA[provider].name,
    description: PROVIDER_METADATA[provider].description
  }));

  let selectedProvider = $state<(typeof providerOptions)[0] | null>(providerOptions[0]);
  let apiKeyInput: HTMLInputElement | null = $state(null);
  let open = $state(false);

  const isKeySet = $derived.by(() => {
    if (!selectedProvider) return false;
    return keys[selectedProvider.value] === true;
  });

  const openText = $derived.by(() => (isKeySet ? "Change" : "Set"));

  function handleApiKeyError() {
    apiKeyInput?.focus();
  }

  $effect(() => {
    if (form?.message) {
      handleApiKeyError();
    }
  });
</script>

<div class="api-key-manager">
  <div class="provider-selection">
    <Label>
      <span>Select Provider</span>
      <Select
        items={providerOptions}
        bind:value={selectedProvider}
        placeholder="Choose a provider"
        {ariaListOpen}
        clearable={false}
        searchable={false}
      />
    </Label>
  </div>

  {#if selectedProvider}
    <div class="provider-info">
      <h3>{selectedProvider.label}</h3>
      <p class="description">{selectedProvider.description}</p>
      <div class="status">
        {#if isKeySet}
          <p class="key-set">✓ Your {selectedProvider.label} API key is set.</p>
        {:else}
          <p class="key-not-set">You haven't set your {selectedProvider.label} API key yet.</p>
        {/if}
      </div>

      <Dialog.Root bind:open>
        <Dialog.Trigger>
          {#snippet child({ props })}
            <Button variant="outline" {...props}>
              {openText} API Key
            </Button>
          {/snippet}
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Set your {selectedProvider.label} API key</Dialog.Title>
          </Dialog.Header>
          <section>
            <form
              method="POST"
              action="?/apiKey&provider={selectedProvider.value}"
              use:enhance={() => {
                open = false;
              }}
            >
              <Label>
                <span>API Key</span>
                <Input type="text" name="apiKey" ref={apiKeyInput} required />
              </Label>
              {#if form?.message}
                <p role="alert" class="error-message">{form.message}</p>
              {/if}
              <Button type="submit">Save</Button>
            </form>
          </section>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  {/if}
</div>

<style>
  .api-key-manager {
    max-width: 600px;
    margin: 0 auto;
  }

  .provider-selection {
    margin-bottom: 1.5rem;
  }

  .provider-info h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .description {
    color: #666;
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
  }

  .status {
    margin: 1rem 0;
  }

  .key-set {
    color: #059669;
    margin: 0;
  }

  .key-not-set {
    color: #dc2626;
    margin: 0;
  }

  .error-message {
    color: #dc2626;
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }

  :global(.svelte-select) {
    --border: 1px solid #d1d5db;
    --border-radius: 0.375rem;
    --background: white;
    --list-background: white;
    --item-hover-bg: #f3f4f6;
    --item-hover-color: inherit;
  }
</style>
