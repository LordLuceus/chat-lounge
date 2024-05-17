<script lang="ts">
  import { goto } from "$app/navigation";
  import AgentActions from "$lib/components/AgentActions.svelte";
  import ConversationActions from "$lib/components/ConversationActions.svelte";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Toaster } from "$lib/components/ui/sonner";
  import type { Agent, Conversation } from "$lib/drizzle/schema";
  import { voices } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api/paged-response";
  import type { Voice } from "$lib/types/elevenlabs/voices";
  import { createInfiniteQuery, createQuery, type CreateQueryResult } from "@tanstack/svelte-query";
  import ClerkLoaded from "clerk-sveltekit/client/ClerkLoaded.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import { SunMoon } from "lucide-svelte";
  import { ModeWatcher, resetMode, setMode } from "mode-watcher";
  import type { LayoutData } from "./$types";
  import NavList from "./NavList.svelte";

  export let data: LayoutData;

  const fetchConversations = async ({ pageParam = 1 }) =>
    await fetch(`/api/conversations?page=${pageParam}&limit=20`).then((res) => res.json());

  const fetchAgents = async ({ pageParam = 1 }) =>
    await fetch(`/api/agents?page=${pageParam}&limit=20`).then((res) => res.json());

  const conversationsQuery = createInfiniteQuery<PagedResponse<Conversation>>({
    queryKey: ["conversations"],
    queryFn: ({ pageParam }) => fetchConversations({ pageParam: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }

      return undefined;
    }
  });

  const agentsQuery = createInfiniteQuery<PagedResponse<Agent>>({
    queryKey: ["agents"],
    queryFn: ({ pageParam }) => fetchAgents({ pageParam: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }

      return undefined;
    }
  });

  let voicesQuery: CreateQueryResult<Voice[], Error>;
  $: if (data.keys.eleven)
    voicesQuery = createQuery<Voice[]>({
      queryKey: ["voices"],
      queryFn: async () => (await fetch("/api/voices")).json(),
      refetchInterval: 60000
    });

  $: if ($voicesQuery) voices.set($voicesQuery.data);
</script>

<header class="flex items-center justify-between p-4">
  <a href="/">
    <img src="/assets/chatlounge_logo.webp" alt="ChatLounge" />
  </a>
  <nav class="flex">
    <a href="/">Home</a>
    {#if $conversationsQuery.isSuccess && $conversationsQuery.data.pages[0].meta.total > 0}
      <NavList query={conversationsQuery} itemType="Conversations">
        <div slot="link" let:item>
          <a href={`${item.agentId ? "/agents/" + item.agentId : ""}/conversations/${item.id}`}
            >{item.name}</a
          >
        </div>
        <div slot="menu" let:item>
          <ConversationActions id={item.id} name={item.name} />
        </div>
      </NavList>
    {/if}
    {#if $agentsQuery.isSuccess && $agentsQuery.data.pages[0].meta.total > 0}
      <NavList query={agentsQuery} itemType="Agents">
        <div slot="link" let:item>
          <a href={`/agents/${item.id}`}>{item.name}</a>
        </div>
        <div slot="menu" let:item>
          <AgentActions id={item.id} name={item.name} />
        </div>
      </NavList>
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

<main class="flex flex-col items-center">
  <slot />
</main>

<footer>
  <a href="/changelog">Changelog</a>
</footer>

<Toaster />
