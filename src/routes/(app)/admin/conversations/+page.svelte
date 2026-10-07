<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function pageLink(target: number) {
    const search = new URLSearchParams(page.url.searchParams);
    search.set("page", String(target));
    return `?${search}`;
  }
</script>

<svelte:head>
  <title>Conversations | Admin | ChatLounge</title>
</svelte:head>

<section class="flex flex-col gap-6">
  <h1>Conversations ({data.total.toLocaleString()})</h1>
  <p class="text-sm text-muted-foreground">
    This list shows conversation details only. Message content stays private to its users.
  </p>

  <form method="GET" class="flex flex-wrap items-end gap-2">
    <label class="flex flex-col">
      User
      <select name="user" class="rounded border px-2 py-1">
        <option value="">All users</option>
        {#each data.options.users as user (user.id)}
          <option value={user.id} selected={user.id === data.filters.user}>{user.username}</option>
        {/each}
      </select>
    </label>
    <label class="flex flex-col">
      Model
      <select name="model" class="rounded border px-2 py-1">
        <option value="">All models</option>
        <option value="none" selected={data.filters.model === "none"}>No model</option>
        {#each data.options.models as model (model.id)}
          <option value={model.id} selected={model.id === data.filters.model}>
            {model.name} ({model.provider})
          </option>
        {/each}
      </select>
    </label>
    <label class="flex flex-col">
      Name contains
      <Input type="search" name="q" value={data.filters.q} />
    </label>
    <Button type="submit">Filter</Button>
    <a href="/admin/conversations">Clear filters</a>
  </form>

  {#if data.conversations.length === 0}
    <p>No conversations match.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <caption class="sr-only">Conversations, page {data.page} of {data.pageCount}</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Users</th>
            <th scope="col">Model</th>
            <th scope="col">Agent</th>
            <th scope="col">Messages</th>
            <th scope="col">Created</th>
            <th scope="col">Last updated</th>
          </tr>
        </thead>
        <tbody>
          {#each data.conversations as conversation (conversation.id)}
            <tr class="border-t">
              <th scope="row" class="font-normal">
                {conversation.name}{conversation.isImporting ? " (importing)" : ""}
              </th>
              <td>{conversation.users.map((u) => u.username).join(", ") || "none"}</td>
              <td>{conversation.model?.name ?? "none"}</td>
              <td>{conversation.agent?.name ?? "none"}</td>
              <td>{conversation.messages.toLocaleString()}</td>
              <td>{formatDate(conversation.createdAt)}</td>
              <td>{formatDate(conversation.updatedAt)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if data.pageCount > 1}
      <nav aria-label="Pages" class="flex items-center gap-4">
        {#if data.page > 1}
          <a href={pageLink(data.page - 1)}>Previous page</a>
        {/if}
        <span>Page {data.page} of {data.pageCount}</span>
        {#if data.page < data.pageCount}
          <a href={pageLink(data.page + 1)}>Next page</a>
        {/if}
      </nav>
    {/if}
  {/if}
</section>
