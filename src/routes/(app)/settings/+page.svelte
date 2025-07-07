<script lang="ts">
  import { AIProvider } from "$lib/types/db";
  import { SignedIn } from "svelte-clerk";
  import { useClerkContext } from "svelte-clerk/client";
  import type { ActionData, PageData } from "./$types";
  import ApiKeyForm from "./ApiKeyForm.svelte";

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
    <p>Here you can manage your API keys.</p>
    <h2>API Keys</h2>
    <p>
      Manage your API keys for supported providers. To use the app, at least one of Mistral, OpenAI,
      Google, Anthropic, or XAI is required. ElevenLabs is required for voice conversations.
    </p>
    <h3>Mistral</h3>
    {#if data.keys?.mistral}
      <p>Your Mistral API key is set.</p>
      <ApiKeyForm provider={AIProvider.Mistral} openText="Change" {form} />
    {:else}
      <p>You haven't set your Mistral API key yet.</p>
      <ApiKeyForm provider={AIProvider.Mistral} openText="Set" {form} />
    {/if}
    <h3>OpenAI</h3>
    {#if data.keys?.openai}
      <p>Your OpenAI API key is set.</p>
      <ApiKeyForm provider={AIProvider.OpenAI} openText="Change" {form} />
    {:else}
      <p>You haven't set your OpenAI API key yet.</p>
      <ApiKeyForm provider={AIProvider.OpenAI} openText="Set" {form} />
    {/if}
    <h3>ElevenLabs</h3>
    {#if data.keys?.eleven}
      <p>Your ElevenLabs API key is set.</p>
      <ApiKeyForm provider={AIProvider.ElevenLabs} openText="Change" {form} />
    {:else}
      <p>You haven't set your ElevenLabs API key yet.</p>
      <ApiKeyForm provider={AIProvider.ElevenLabs} openText="Set" {form} />
    {/if}
    <h3>Google</h3>
    {#if data.keys?.google}
      <p>Your Google API key is set.</p>
      <ApiKeyForm provider={AIProvider.Google} openText="Change" {form} />
    {:else}
      <p>You haven't set your Google API key yet.</p>
      <ApiKeyForm provider={AIProvider.Google} openText="Set" {form} />
    {/if}
    <h3>Anthropic</h3>
    {#if data.keys?.anthropic}
      <p>Your Anthropic API key is set.</p>
      <ApiKeyForm provider={AIProvider.Anthropic} openText="Change" {form} />
    {:else}
      <p>You haven't set your Anthropic API key yet.</p>
      <ApiKeyForm provider={AIProvider.Anthropic} openText="Set" {form} />
    {/if}
    <h3>XAI</h3>
    {#if data.keys?.xai}
      <p>Your XAI API key is set.</p>
      <ApiKeyForm provider={AIProvider.XAI} openText="Change" {form} />
    {:else}
      <p>You haven't set your XAI API key yet.</p>
      <ApiKeyForm provider={AIProvider.XAI} openText="Set" {form} />
    {/if}
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
