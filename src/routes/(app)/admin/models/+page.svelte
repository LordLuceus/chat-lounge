<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import type { Model } from "@prisma/client";
  import type { ActionData, PageData } from "./$types";

  interface Props {
    data: PageData;
    form: ActionData;
  }

  const { data, form }: Props = $props();

  let syncing = $state(false);

  function formatDate(date: Date | string | null) {
    if (!date) return "unknown";
    return new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" });
  }

  function yesNo(value: boolean) {
    return value ? "yes" : "no";
  }
</script>

<svelte:head>
  <title>Manage models | ChatLounge</title>
</svelte:head>

{#snippet details(model: Model)}
  <ul>
    <li>ID: <code>{model.id}</code></li>
    <li>Released: {formatDate(model.releaseDate)}</li>
    <li>Context window: {model.tokenLimit.toLocaleString()} tokens</li>
    <li>Tools: {yesNo(model.supportsTools)}</li>
    <li>Images: {yesNo(model.supportsImages)}</li>
    <li>Video: {yesNo(model.supportsVideo)}</li>
  </ul>
{/snippet}

<section class="flex flex-col gap-6">
  <h1>Manage models</h1>

  <div role="status" aria-live="polite">
    {#if form?.message}
      <p>{form.message}</p>
    {/if}
  </div>

  <div>
    <h2>Sync with models.dev</h2>
    <p>
      The sync runs daily. It updates existing models and adds new ones here for review. Reasoning
      settings are guesses, so check them before approving.
    </p>
    <form
      method="POST"
      action="?/sync"
      use:enhance={() => {
        syncing = true;
        return async ({ update }) => {
          await update();
          syncing = false;
        };
      }}
    >
      <Button type="submit" disabled={syncing}>{syncing ? "Syncing…" : "Sync now"}</Button>
    </form>
  </div>

  <div>
    <h2>Pending models ({data.pending.length})</h2>
    {#if data.pending.length === 0}
      <p>No models are waiting for review.</p>
    {:else}
      <ul class="flex flex-col gap-6">
        {#each data.pending as model (model.id)}
          <li>
            <h3>{model.name} ({model.provider})</h3>
            {@render details(model)}
            <form method="POST" action="?/approve" use:enhance class="flex flex-col gap-2">
              <input type="hidden" name="id" value={model.id} />
              <label>
                Reasoning type
                <select name="reasoningType" class="rounded border px-2 py-1">
                  <option value="none" selected={model.reasoningType === "none"}>
                    None: no thinking
                  </option>
                  <option value="hybrid" selected={model.reasoningType === "hybrid"}>
                    Hybrid: user can switch thinking on or off
                  </option>
                  <option value="full" selected={model.reasoningType === "full"}>
                    Full: always thinks
                  </option>
                </select>
              </label>
              {#if model.provider === "anthropic"}
                <label>
                  Adaptive thinking
                  <select name="adaptiveThinking" class="rounded border px-2 py-1">
                    <option value="true" selected={model.adaptiveThinking === true}>Yes</option>
                    <option value="false" selected={model.adaptiveThinking !== true}>No</option>
                  </select>
                </label>
              {/if}
              <div class="flex gap-2">
                <Button type="submit">Approve {model.name}</Button>
                <Button type="submit" variant="outline" formaction="?/reject">
                  Reject {model.name}
                </Button>
              </div>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="overflow-x-auto">
    <h2>Approved models ({data.approved.length})</h2>
    <p>Deprecated models are hidden from the model picker for new conversations.</p>
    <table class="w-full text-left">
      <caption class="sr-only">Approved models</caption>
      <thead>
        <tr>
          <th scope="col">Model</th>
          <th scope="col">Provider</th>
          <th scope="col">Released</th>
          <th scope="col">Conversations</th>
          <th scope="col">Agents</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each data.approved as model (model.id)}
          <tr class="border-t">
            <th scope="row" class="font-normal">
              <a href={`/admin/conversations?model=${encodeURIComponent(model.id)}`}>{model.name}</a
              >
            </th>
            <td>{model.provider}</td>
            <td>{formatDate(model.releaseDate)}</td>
            <td>{model.conversations.toLocaleString()}</td>
            <td>{model.agents.toLocaleString()}</td>
            <td>
              <form method="POST" action="?/setDeprecated" use:enhance>
                <input type="hidden" name="id" value={model.id} />
                <input type="hidden" name="deprecated" value={String(!model.deprecated)} />
                <Button type="submit" variant="outline" size="sm">
                  {model.deprecated ? `Restore ${model.name}` : `Deprecate ${model.name}`}
                </Button>
              </form>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if data.rejected.length > 0}
    <div>
      <h2>Rejected models ({data.rejected.length})</h2>
      <p>The sync won't add these again. Restore one to review it again.</p>
      <ul class="flex flex-col gap-4">
        {#each data.rejected as model (model.id)}
          <li>
            <h3>{model.name} ({model.provider})</h3>
            <form method="POST" action="?/restore" use:enhance>
              <input type="hidden" name="id" value={model.id} />
              <Button type="submit" variant="outline">Restore {model.name} to pending</Button>
            </form>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>
