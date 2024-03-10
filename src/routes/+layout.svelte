<script lang="ts">
  import "../app.pcss";
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";
  import { signIn, signOut } from "@auth/sveltekit/client";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

  export let data: PageData;
</script>

<header>
  <a href="/">
    <img src="/assets/chatmate_logo.webp" alt="ChatMate" />
  </a>
  {#if data.session}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <img src={data.session?.user?.image} alt={data.session?.user?.name} />
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
