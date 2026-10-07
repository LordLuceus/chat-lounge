<script lang="ts">
  import { page } from "$app/state";

  interface Props {
    children?: import("svelte").Snippet;
  }

  const { children }: Props = $props();

  const links = [
    { href: "/admin", label: "Analytics" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/models", label: "Models" },
    { href: "/admin/conversations", label: "Conversations" }
  ];
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-4 p-4">
  <nav aria-label="Admin">
    <ul class="flex flex-wrap gap-4">
      {#each links as link (link.href)}
        <li>
          <a
            href={link.href}
            aria-current={page.url.pathname === link.href ? "page" : undefined}
            class="aria-[current=page]:font-bold">{link.label}</a
          >
        </li>
      {/each}
    </ul>
  </nav>
  {@render children?.()}
</div>
