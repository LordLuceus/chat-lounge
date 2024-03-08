<script lang="ts">
  import "../app.pcss";
  import { page } from "$app/stores";
  import { signIn, signOut } from "@auth/sveltekit/client";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
</script>

<header>
  {#if $page.data.session}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <img src={$page.data.session?.user?.image} alt={$page.data.session?.user?.name} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item on:click={() => signOut()}>Sign out</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
  {#if !$page.data.session}
    <button on:click={() => signIn("google")}>Sign in with Google</button>
  {/if}
</header>

<main>
  <slot />
</main>
