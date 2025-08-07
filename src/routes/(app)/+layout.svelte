<script lang="ts">
  import { goto } from "$app/navigation";
  import AgentActions from "$lib/components/AgentActions.svelte";
  import ConversationActions from "$lib/components/ConversationActions.svelte";
  import FolderActions from "$lib/components/FolderActions.svelte";
  import NewVersionPopup from "$lib/components/NewVersionPopup.svelte";
  import * as Collapsible from "$lib/components/ui";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Toaster } from "$lib/components/ui/sonner";
  import { generateTTS } from "$lib/services/tts-service";
  import { audioFilename, currentAudioUrl, downloadUrl, ttsProps, voices } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { Voice } from "$lib/types/elevenlabs";
  import { SunMoon } from "@lucide/svelte";
  import type { Agent, Conversation, Folder } from "@prisma/client";
  import { createInfiniteQuery, createQuery, type CreateQueryResult } from "@tanstack/svelte-query";
  import { resetMode, setMode } from "mode-watcher";
  import { ClerkLoaded, SignedIn, SignedOut } from "svelte-clerk";
  import { useClerkContext } from "svelte-clerk/client";
  import { toast } from "svelte-sonner";
  import type { LayoutData } from "./$types";
  import NavList from "./NavList.svelte";

  interface Props {
    data: LayoutData;
    children?: import("svelte").Snippet;
  }

  const { data, children }: Props = $props();

  const ctx = useClerkContext();

  const user = $derived(ctx.user);

  const fetchConversations = async ({ pageParam = 1 }) =>
    await fetch(`/api/conversations?page=${pageParam}&limit=20`).then((res) => res.json());

  const fetchAgents = async ({ pageParam = 1 }) =>
    await fetch(`/api/agents?page=${pageParam}&limit=20`).then((res) => res.json());

  const fetchFolders = async ({ pageParam = 1 }) =>
    await fetch(`/api/folders?page=${pageParam}&limit=20`).then((res) => res.json());

  const conversationsQuery = createInfiniteQuery<PagedResponse<Conversation>>(() => ({
    queryKey: ["conversations"],
    queryFn: ({ pageParam }) => fetchConversations({ pageParam: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }

      return undefined;
    }
  }));

  const agentsQuery = createInfiniteQuery<PagedResponse<Agent>>(() => ({
    queryKey: ["agents"],
    queryFn: ({ pageParam }) => fetchAgents({ pageParam: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }

      return undefined;
    }
  }));

  const foldersQuery = createInfiniteQuery<PagedResponse<Folder>>(() => ({
    queryKey: ["folders"],
    queryFn: ({ pageParam }) => fetchFolders({ pageParam: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }

      return undefined;
    }
  }));

  let voicesQuery: CreateQueryResult<Voice[], Error> | undefined = $state();
  $effect(() => {
    if (data.keys?.elevenlabs)
      voicesQuery = createQuery<Voice[]>(() => ({
        queryKey: ["voices"],
        queryFn: async () => (await fetch("/api/voices")).json(),
        refetchInterval: 60000
      }));
  });

  $effect(() => {
    if (voicesQuery) voices.set(voicesQuery.data);
  });

  let audioEl: HTMLAudioElement = $state()!;

  $effect(() => {
    if ($ttsProps && audioEl) {
      downloadUrl.set("");
      audioFilename.set("");

      generateTTS({
        audioElement: audioEl,
        text: $ttsProps.text,
        voice: $ttsProps.voice,
        modelId: $ttsProps.modelId,
        onDownloadReady: ({ downloadUrl: newUrl, filename }) => {
          downloadUrl.set(newUrl);
          audioFilename.set(filename);
        },
        onError: (error: string) => toast.error(error),
        signal: $ttsProps.signal
      });
    }
  });

  let ttsOpen = $state(false);
</script>

<SignedIn>
  <header class="flex items-center justify-between p-4">
    <a href="/">
      <img src="/assets/chatlounge_logo.webp" alt="ChatLounge" />
    </a>
    <nav class="flex">
      <a href="/">Home</a>
      {#if conversationsQuery.isSuccess && conversationsQuery.data.pages[0].meta.total > 0}
        <NavList query={conversationsQuery} itemType="Conversations">
          {#snippet link({ item })}
            <div>
              <a href={`${item.agentId ? "/agents/" + item.agentId : ""}/conversations/${item.id}`}
                >{item.name}</a
              >
            </div>
          {/snippet}
          {#snippet menu({ item })}
            <div>
              <ConversationActions
                id={item.id}
                name={item.name}
                sharedConversationId={item.sharedConversationId}
                isPinned={item.isPinned}
                folderId={item.folderId}
              />
            </div>
          {/snippet}
        </NavList>
      {/if}
      {#if agentsQuery.isSuccess && agentsQuery.data.pages[0].meta.total > 0}
        <NavList query={agentsQuery} itemType="Agents">
          {#snippet link({ item })}
            <div>
              <a href={`/agents/${item.id}`}>{item.name}</a>
            </div>
          {/snippet}
          {#snippet menu({ item })}
            <div>
              {#if user?.id === item.userId}
                <AgentActions id={item.id} name={item.name} />
              {/if}
            </div>
          {/snippet}
        </NavList>
      {:else}
        <a href="/agents">Agents</a>
      {/if}
      {#if foldersQuery.isSuccess && foldersQuery.data.pages[0].meta.total > 0}
        <NavList query={foldersQuery} itemType="Folders">
          {#snippet link({ item })}
            <div>
              <a href={`/folders/${item.id}`}>{item.name}</a>
            </div>
          {/snippet}
          {#snippet menu({ item })}
            <div>
              <FolderActions id={item.id} name={item.name} />
            </div>
          {/snippet}
        </NavList>
      {:else}
        <a href="/folders">Folders</a>
      {/if}
      {#if data?.keys?.elevenlabs}
        <Collapsible.Root bind:open={ttsOpen}>
          <Collapsible.Trigger aria-expanded={ttsOpen}>TTS</Collapsible.Trigger>
          <Collapsible.Content>
            <ul class="list-none">
              <li><a href="/generate-tts">Generate Speech</a></li>
              <li>
                <a href="/voices">Voices</a>
              </li>
              <li>
                <a href="/tts-history">History</a>
              </li>
            </ul>
          </Collapsible.Content>
        </Collapsible.Root>
      {/if}
    </nav>
    <ClerkLoaded>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Avatar.Root>
            <Avatar.Image src={user?.imageUrl} alt={user?.username} />
            <Avatar.Fallback>{user?.username}</Avatar.Fallback>
          </Avatar.Root>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item onclick={() => goto("/conversations/shared")}
            >My shared conversations</DropdownMenu.Item
          >
          <DropdownMenu.Item onclick={() => goto("/settings")}>Settings</DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => goto("/profile")}>Account</DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={async () => {
              await ctx.clerk?.signOut();
              goto("/auth/sign-in");
            }}>Sign out</DropdownMenu.Item
          >
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </ClerkLoaded>
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
    {#if $ttsProps || $currentAudioUrl}
      <section
        aria-label="Audio player"
        class="fixed bottom-0 left-0 right-0 border-t bg-background p-4"
      >
        <audio bind:this={audioEl} controls autoplay class="w-full"></audio>
        {#if $currentAudioUrl && audioEl}
          {(audioEl.src = $currentAudioUrl)}
        {/if}
        {#if $downloadUrl}
          <div class="mt-2 text-center">
            <a
              href={$downloadUrl}
              download={$audioFilename}
              class="text-sm text-primary hover:underline">Download audio</a
            >
          </div>
        {/if}
      </section>
    {/if}
  </main>

  <footer>
    <a href="/changelog">Changelog</a>
  </footer>
</SignedIn>

<SignedOut>
  <header class="flex items-center justify-between p-4">
    <a href="/auth/sign-in">Sign in</a>
    <a href="/auth/sign-up">Sign up</a>
  </header>
  <main class="flex flex-col items-center">
    {@render children?.()}
  </main>
  <footer>
    <a href="/changelog">Changelog</a>
  </footer>
</SignedOut>

<Toaster />
<NewVersionPopup />
