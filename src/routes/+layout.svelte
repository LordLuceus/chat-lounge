<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Toaster } from "$lib/components/ui/sonner";
  import SignInButton from "clerk-sveltekit/client/SignInButton.svelte";
  import SignUpButton from "clerk-sveltekit/client/SignUpButton.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import SignedOut from "clerk-sveltekit/client/SignedOut.svelte";
  import UserButton from "clerk-sveltekit/client/UserButton.svelte";
  import { SunMoon } from "lucide-svelte";
  import { ModeWatcher, resetMode, setMode } from "mode-watcher";
  import "../app.pcss";
</script>

<header>
  <a href="/">
    <img src="/assets/chatmate_logo.webp" alt="ChatMate" />
  </a>
  <nav>
    <a href="/">Home</a>
    {#if $page.data?.keys?.eleven}
      <a href="/voices">Voices</a>
    {/if}
  </nav>
  <SignedIn>
    <a href="/settings">Settings</a>
    <UserButton
      afterSignOutUrl="/auth/sign-in"
      signInUrl="/auth/sign-in"
      userProfileMode="navigation"
      userProfileUrl="/profile"
    />
  </SignedIn>
  <SignedOut>
    <SignInButton />
    <SignUpButton />
  </SignedOut>
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
      <Button builders={[builder]} variant="outline" size="icon">
        <SunMoon />
        <span class="sr-only">Toggle theme</span>
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Item on:click={() => setMode("light")}>Light</DropdownMenu.Item>
      <DropdownMenu.Item on:click={() => setMode("dark")}>Dark</DropdownMenu.Item>
      <DropdownMenu.Item on:click={() => resetMode()}>System</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</header>

<ModeWatcher />

<main>
  <slot />
</main>

<footer>
  <a href="/changelog">Changelog</a>
</footer>

<Toaster />

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
