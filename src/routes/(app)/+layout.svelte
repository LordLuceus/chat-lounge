<script lang="ts">
  import { goto } from "$app/navigation";
  import AgentActions from "$lib/components/AgentActions.svelte";
  import ConversationActions from "$lib/components/ConversationActions.svelte";
  import FolderActions from "$lib/components/FolderActions.svelte";
  import NewVersionPopup from "$lib/components/NewVersionPopup.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Toaster } from "$lib/components/ui/sonner";
  import type { Agent, Conversation, Folder } from "$lib/drizzle/schema";
  import { generateTTS } from "$lib/services/tts-service";
  import { audioFilename, currentAudioUrl, downloadUrl, ttsProps, voices } from "$lib/stores";
  import type { PagedResponse } from "$lib/types/api";
  import type { Voice } from "$lib/types/elevenlabs";
  import { createInfiniteQuery, createQuery, type CreateQueryResult } from "@tanstack/svelte-query";
  import ClerkLoaded from "clerk-sveltekit/client/ClerkLoaded.svelte";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import SignedOut from "clerk-sveltekit/client/SignedOut.svelte";
  import { SunMoon } from "lucide-svelte";
  import { resetMode, setMode } from "mode-watcher";
  import { toast } from "svelte-sonner";
  import type { LayoutData } from "./$types";
  import NavList from "./NavList.svelte";

  export let data: LayoutData;

  const fetchConversations = async ({ pageParam = 1 }) =>
    await fetch(`/api/conversations?page=${pageParam}&limit=20`).then((res) => res.json());

  const fetchAgents = async ({ pageParam = 1 }) =>
    await fetch(`/api/agents?page=${pageParam}&limit=20`).then((res) => res.json());

  const fetchFolders = async ({ pageParam = 1 }) =>
    await fetch(`/api/folders?page=${pageParam}&limit=20`).then((res) => res.json());

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

  const foldersQuery = createInfiniteQuery<PagedResponse<Folder>>({
    queryKey: ["folders"],
    queryFn: ({ pageParam }) => fetchFolders({ pageParam: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }

      return undefined;
    }
  });

  let voicesQuery: CreateQueryResult<Voice[], Error>;
  $: if (data.keys?.eleven)
    voicesQuery = createQuery<Voice[]>({
      queryKey: ["voices"],
      queryFn: async () => (await fetch("/api/voices")).json(),
      refetchInterval: 60000
    });

  $: if ($voicesQuery) voices.set($voicesQuery.data);

  function setDownloadUrlAndFilename(url: string, filename: string) {
    downloadUrl.set(url);
    audioFilename.set(filename);
  }

  $: if ($ttsProps) {
    generateTTS({
      text: $ttsProps.text,
      voice: $ttsProps.voice,
      modelId: $ttsProps.modelId,
      onPlayAudio: (audioUrl: string | null) => currentAudioUrl.set(audioUrl),
      onDownloadAudio: ({ downloadUrl, filename }) =>
        setDownloadUrlAndFilename(downloadUrl, filename),
      onError: (error: string) => toast.error(Toast, { componentProps: { text: error } }),
      signal: $ttsProps.signal
    });
  }

  let ttsOpen = false;
</script>

<SignedIn let:user>
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
            <ConversationActions
              id={item.id}
              name={item.name}
              sharedConversationId={item.sharedConversationId}
              isPinned={item.isPinned}
              folderId={item.folderId}
            />
          </div>
        </NavList>
      {/if}
      {#if $agentsQuery.isSuccess && $agentsQuery.data.pages[0].meta.total > 0}
        <NavList query={agentsQuery} itemType="Agents">
          <div slot="link" let:item>
            <a href={`/agents/${item.id}`}>{item.name}</a>
          </div>
          <div slot="menu" let:item>
            {#if user?.id === item.userId}
              <AgentActions id={item.id} name={item.name} />
            {/if}
          </div>
        </NavList>
      {:else}
        <a href="/agents">Agents</a>
      {/if}
      {#if $foldersQuery.isSuccess && $foldersQuery.data.pages[0].meta.total > 0}
        <NavList query={foldersQuery} itemType="Folders">
          <div slot="link" let:item>
            <a href={`/folders/${item.id}`}>{item.name}</a>
          </div>
          <div slot="menu" let:item>
            <FolderActions id={item.id} name={item.name} />
          </div>
        </NavList>
      {:else}
        <a href="/folders">Folders</a>
      {/if}
      {#if data?.keys?.eleven}
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
    <ClerkLoaded let:clerk>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Avatar.Root>
            <Avatar.Image src={clerk?.user?.imageUrl} alt={clerk?.user?.username} />
            <Avatar.Fallback>{clerk?.user?.username}</Avatar.Fallback>
          </Avatar.Root>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item on:click={() => goto("/conversations/shared")}
            >My shared conversations</DropdownMenu.Item
          >
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

  <main class="flex flex-col items-center">
    <slot />

    {#if $currentAudioUrl}
      <section aria-label="Audio player">
        <audio src={$currentAudioUrl} controls autoplay />
        {#if $downloadUrl}
          <a href={$downloadUrl} download={$audioFilename}>Download audio</a>
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
    <slot />
  </main>
  <footer>
    <a href="/changelog">Changelog</a>
  </footer>
</SignedOut>

<Toaster />
<NewVersionPopup />
