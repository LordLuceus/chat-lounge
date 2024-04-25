<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Toaster } from "$lib/components/ui/sonner";
  import type { Conversation } from "$lib/drizzle/schema";
  import { voices } from "$lib/stores/voices-store";
  import type { PagedResponse } from "$lib/types/api/paged-response";
  import type { Voice } from "$lib/types/elevenlabs/voices";
  import { createInfiniteQuery, createQuery } from "@tanstack/svelte-query";
  import ClerkLoaded from "clerk-sveltekit/client/ClerkLoaded.svelte";
  import SignInButton from "clerk-sveltekit/client/SignInButton.svelte";
  import SignUpButton from "clerk-sveltekit/client/SignUpButton.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import SignedOut from "clerk-sveltekit/client/SignedOut.svelte";
  import { SunMoon } from "lucide-svelte";
  import { ModeWatcher, resetMode, setMode } from "mode-watcher";
  import InfiniteScroll from "svelte-infinite-scroll";
  import "../../app.pcss";
  import type { LayoutData } from "./$types";
  import ConversationActions from "./conversations/ConversationActions.svelte";

  export let data: LayoutData;

  let agentsExpanded = false;
  let conversationsExpanded = false;

  const fetchConversations = async ({ pageParam = 1 }) =>
    await fetch(`/api/conversations?page=${pageParam}`).then((res) => res.json());

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

  const recentAgentsQuery = createQuery({
    queryKey: ["agents", "recent"],
    queryFn: async () => (await fetch("/api/agents?recent=true")).json(),
    initialData: data.agents
  });

  const voicesQuery = createQuery<Voice[]>({
    queryKey: ["voices"],
    queryFn: async () => (await fetch("/api/voices")).json(),
    refetchInterval: 60000
  });

  $: voices.set($voicesQuery.data);
</script>

<header class="flex items-center justify-between p-4">
  <a href="/">
    <img src="/assets/chatlounge_logo.webp" alt="ChatLounge" />
  </a>
  <nav class="flex">
    <a href="/">Home</a>
    {#if $conversationsQuery.isSuccess}
      <Collapsible.Root bind:open={conversationsExpanded}>
        <Collapsible.Trigger aria-expanded={conversationsExpanded}
          >Conversations</Collapsible.Trigger
        >
        <Collapsible.Content>
          <ul class="list-none">
            {#each $conversationsQuery.data.pages as { data }}
              {#each data as conversation}
                <li>
                  <a
                    href={`${conversation.agentId ? "/agents/" + conversation.agentId : ""}/conversations/${conversation.id}`}
                    >{conversation.name}</a
                  >
                  <ConversationActions
                    conversationId={conversation.id}
                    conversationName={conversation.name}
                  />
                </li>
              {/each}
            {/each}
            <InfiniteScroll
              threshold={100}
              on:loadMore={() =>
                !$conversationsQuery.isFetching && $conversationsQuery.fetchNextPage()}
            />
          </ul>
          <a href="/conversations">All conversations</a>
        </Collapsible.Content>
      </Collapsible.Root>
    {/if}
    {#if $recentAgentsQuery.data?.length > 0}
      <Collapsible.Root bind:open={agentsExpanded}>
        <Collapsible.Trigger aria-expanded={agentsExpanded}>Agents</Collapsible.Trigger>
        <Collapsible.Content>
          <ul class="list-none">
            {#each $recentAgentsQuery.data as agent}
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

<main class="flex flex-col items-center">
  <slot />
</main>

<footer>
  <a href="/changelog">Changelog</a>
</footer>

<Toaster />
