<script lang="ts">
  import ApiKeyManager from "$lib/components/ApiKeyManager.svelte";
  import BaseInstructionsManager from "$lib/components/BaseInstructionsManager.svelte";
  import { SignedIn } from "svelte-clerk";
  import { useClerkContext } from "svelte-clerk/client";
  import type { ActionData, PageData } from "./$types";

  interface Props {
    data: PageData;
    form: ActionData;
  }

  const { data, form }: Props = $props();

  const ctx = useClerkContext();
  const user = $derived(ctx.user);
</script>

<svelte:head>
  <title>Settings | ChatLounge</title>
  <meta name="description" content="User settings page for ChatLounge" />
</svelte:head>

<section>
  <SignedIn>
    <h1>Settings</h1>
    <p>Welcome, {user?.username}!</p>
    <p>Here you can manage your API keys and custom model instructions.</p>
    <h2>API Keys</h2>
    <p>
      Manage your API keys for supported providers. To use the app, at least one of Mistral, OpenAI,
      Google, Anthropic, XAI, or OpenRouter is required. ElevenLabs is required for voice
      conversations.
    </p>

    <ApiKeyManager keys={data?.keys || {}} {form} />

    <h2>Base Instructions</h2>
    <p>
      Configure how AI agents respond by managing the core behavioral guidelines. Base instructions
      define communication style, objectivity standards, and interaction patterns.
    </p>

    <BaseInstructionsManager
      useBaseInstructions={data?.useBaseInstructions}
      customBaseInstructions={data?.customBaseInstructions}
      {form}
    />

    <h2>Account</h2>
    <p>
      You can manage your account settings, such as your username and email, directly in the
      <a href="/profile">profile page</a>.
    </p>
  </SignedIn>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 0.6;
  }
</style>
