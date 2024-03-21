<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Avatar from "$lib/components/ui/avatar";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Toaster } from "$lib/components/ui/sonner";
  import { signIn, signOut } from "@auth/sveltekit/client";
  import "../app.pcss";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<header>
  <a href="/">
    <img src="/assets/chatmate_logo.webp" alt="ChatMate" />
  </a>
  <nav>
    <a href="/">Home</a>
    {#if data.session && data?.keys?.eleven}
      <a href="/voices">Voices</a>
    {/if}
  </nav>
  {#if data.session}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Avatar.Root>
          <Avatar.Image src={data.session.user?.image} alt={data.session.user?.name} />
          <Avatar.Fallback>{data.session.user?.name}</Avatar.Fallback>
        </Avatar.Root>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item on:click={() => goto("/settings")}>Settings</DropdownMenu.Item>
        <DropdownMenu.Item on:click={() => signOut()}>Sign out</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
  {#if !data.session}
    <button on:click={() => signIn("google")}>Sign in with Google</button>
  {/if}
</header>

<main>
  <slot />
</main>

<div role="alert">
  <Toaster />
</div>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background-color: var(--color-primary);
  }

  nav {
    display: flex;
    gap: 1rem;
  }

  a {
    color: var(--color-text);
    text-decoration: none;
  }

  img {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
  }

  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 0.6;
  }
</style>
