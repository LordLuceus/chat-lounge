<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Toaster } from "$lib/components/ui/sonner";
  import { SunMoon } from "@lucide/svelte";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkLoaded, SignedIn, SignedOut } from "svelte-clerk";

  interface Props {
    children?: import("svelte").Snippet;
  }

  const { children }: Props = $props();
</script>

<ClerkLoaded>
  <SignedIn>
    <header class="flex items-center justify-between p-4">
      <a href="/">
        <img src="/assets/chatlounge_logo.webp" alt="ChatLounge" />
      </a>
      <nav class="flex">
        <a href="/">Home</a>
      </nav>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="outline" size="icon">
              <SunMoon />
              <span class="sr-only">Toggle theme</span>
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item onclick={() => setMode("light")}>Light</DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => setMode("dark")}>Dark</DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => resetMode()}>System</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </header>

    <main class="flex flex-col items-center">
      {@render children?.()}
    </main>

    <footer>
      <a href="/changelog">Changelog</a>
    </footer>
  </SignedIn>

  <SignedOut>
    <header class="flex items-center justify-between p-4">
      <a href="/">
        <img src="/assets/chatlounge_logo.webp" alt="ChatLounge" />
      </a>
      <div class="flex gap-2">
        <a href="/auth/sign-in">Sign In</a>
        <a href="/auth/sign-up">Sign Up</a>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button {...props} variant="outline" size="icon">
                <SunMoon />
                <span class="sr-only">Toggle theme</span>
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onclick={() => setMode("light")}>Light</DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => setMode("dark")}>Dark</DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => resetMode()}>System</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </header>

    <main class="flex flex-col items-center">
      {@render children?.()}
    </main>

    <footer>
      <a href="/changelog">Changelog</a>
      <a href="/getting-started">Getting Started</a>
    </footer>
  </SignedOut>
</ClerkLoaded>

<Toaster />
