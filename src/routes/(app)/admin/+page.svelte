<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  const rangeLabel = $derived(data.ranges.find((r) => r.value === data.range)?.label ?? "");
  const totals = $derived(data.analytics.totals);

  function percent(count: number, total: number) {
    return total === 0 ? 0 : Math.round((count / total) * 100);
  }

  function conversationsLink(params: Record<string, string | null>) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      search.set(key, value ?? "none");
    }
    return `/admin/conversations?${search}`;
  }
</script>

<svelte:head>
  <title>Analytics | Admin | ChatLounge</title>
</svelte:head>

<section class="flex flex-col gap-6">
  <h1>Analytics</h1>

  <form method="GET" class="flex items-end gap-2">
    <label class="flex flex-col">
      Time range
      <select name="range" class="rounded border px-2 py-1">
        {#each data.ranges as range (range.value)}
          <option value={range.value} selected={range.value === data.range}>{range.label}</option>
        {/each}
      </select>
    </label>
    <Button type="submit">Show</Button>
  </form>

  <div>
    <h2>Summary: {rangeLabel}</h2>
    <ul>
      <li>New conversations: {totals.conversations.toLocaleString()}</li>
      <li>Users who started conversations: {totals.users.toLocaleString()}</li>
      <li>Messages sent: {totals.messages.toLocaleString()}</li>
    </ul>
  </div>

  <div class="overflow-x-auto">
    <h2>Conversations per model</h2>
    {#if data.analytics.perModel.length === 0}
      <p>No conversations in this range.</p>
    {:else}
      <table class="w-full text-left">
        <caption class="sr-only">Conversations per model, {rangeLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Model</th>
            <th scope="col">Provider</th>
            <th scope="col">Conversations</th>
            <th scope="col">Share</th>
            <th scope="col">Replies</th>
          </tr>
        </thead>
        <tbody>
          {#each data.analytics.perModel as row (row.modelId ?? "none")}
            {@const share = percent(row.conversations, totals.conversations)}
            <tr class="border-t">
              <th scope="row" class="font-normal">
                <a href={conversationsLink({ model: row.modelId })}>{row.name}</a>
              </th>
              <td>{row.provider ?? "none"}</td>
              <td>{row.conversations.toLocaleString()}</td>
              <td>
                <div class="flex items-center gap-2">
                  <span class="w-10">{share}%</span>
                  <span class="h-2 w-24 rounded bg-muted" aria-hidden="true">
                    <span class="block h-2 rounded bg-primary" style="width: {share}%"></span>
                  </span>
                </div>
              </td>
              <td>{row.replies.toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="text-sm text-muted-foreground">
        A conversation counts under the model it currently uses. Replies counts assistant messages
        each model wrote in this range, so a conversation that switched models shows up in more than
        one row's replies.
      </p>
    {/if}
  </div>

  <div class="overflow-x-auto">
    <h2>Conversations per user</h2>
    {#if data.analytics.perUser.length === 0}
      <p>No conversations in this range.</p>
    {:else}
      <table class="w-full text-left">
        <caption class="sr-only">Conversations per user, {rangeLabel}</caption>
        <thead>
          <tr>
            <th scope="col">User</th>
            <th scope="col">Conversations</th>
            <th scope="col">Share</th>
            <th scope="col">Models used</th>
          </tr>
        </thead>
        <tbody>
          {#each data.analytics.perUser as row (row.userId)}
            <tr class="border-t align-top">
              <th scope="row" class="font-normal">
                <a href={conversationsLink({ user: row.userId })}>{row.username}</a>
              </th>
              <td>{row.conversations.toLocaleString()}</td>
              <td>{percent(row.conversations, totals.conversations)}%</td>
              <td>
                <ul>
                  {#each row.models as model (model.modelId ?? "none")}
                    <li>
                      <a href={conversationsLink({ user: row.userId, model: model.modelId })}
                        >{model.name}</a
                      >: {model.count.toLocaleString()}
                    </li>
                  {/each}
                </ul>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>
