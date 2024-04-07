<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Toaster } from "$lib/components/ui/sonner";
  import ClerkLoaded from "clerk-sveltekit/client/ClerkLoaded.svelte";
  import SignInButton from "clerk-sveltekit/client/SignInButton.svelte";
  import SignUpButton from "clerk-sveltekit/client/SignUpButton.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import SignedOut from "clerk-sveltekit/client/SignedOut.svelte";
  import { SunMoon } from "lucide-svelte";
  import { ModeWatcher, resetMode, setMode } from "mode-watcher";
  import "../../app.pcss";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let agentsExpanded = false;
</script>

<header>
  <a href="/">
    <img src="/assets/chatlounge_logo.webp" alt="ChatLounge" />
  </a>
  <nav>
    <a href="/">Home</a>
    {#if data.agents.length > 0}
      <Collapsible.Root bind:open={agentsExpanded}>
        <Collapsible.Trigger aria-expanded={agentsExpanded}>Agents</Collapsible.Trigger>
        <Collapsible.Content>
          <ul class="list-none">
            {#each data.agents as agent}
              <li><a href="/agents/{agent.id}">{agent.name}</a></li>
            {/each}
            <li><a href="/agents">All agents</a></li>
          </ul>
        </Collapsible.Content>
      </Collapsible.Root>
    {:else}
      <a href="/agents">Agents</a>
    {/if}
    {#if data?.keys?.eleven}
      <a href="/voices">Voices</a>
    {/if}
  </nav>
  <SignedIn>
    <ClerkLoaded let:clerk>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Avatar.Root>
            <Avatar.Image src={clerk?.user?.imageUrl} alt={clerk?.user?.username} />
            <Avatar.Fallback>{clerk?.user?.username}</Avatar.Fallback>
          </Avatar.Root>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item on:click={() => goto("/settings")}>Settings</DropdownMenu.Item>
          <DropdownMenu.Item on:click={() => goto("/profile")}>Account</DropdownMenu.Item>
          <DropdownMenu.Item
            on:click={async () => {
              await clerk?.signOut();
              goto("/auth/sign-in");
            }}>Sign out</DropdownMenu.Item
          >
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </ClerkLoaded>
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
