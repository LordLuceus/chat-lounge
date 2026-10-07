<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import type { ActionData, PageData } from "./$types";

  interface Props {
    data: PageData;
    form: ActionData;
  }

  const { data, form }: Props = $props();

  function formatDate(date: Date | string | null) {
    if (!date) return "never";
    return new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" });
  }
</script>

<svelte:head>
  <title>Users | Admin | ChatLounge</title>
</svelte:head>

<section class="flex flex-col gap-6">
  <h1>Users ({data.users.length})</h1>

  <div role="status" aria-live="polite">
    {#if form?.message}
      <p>{form.message}</p>
    {/if}
  </div>

  <form method="GET" class="flex items-end gap-2" role="search">
    <label class="flex flex-col">
      Search by username or email
      <Input type="search" name="q" value={data.search} />
    </label>
    <Button type="submit">Search</Button>
  </form>

  {#if data.users.length === 0}
    <p>No users found.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <caption class="sr-only">Users</caption>
        <thead>
          <tr>
            <th scope="col">Username</th>
            <th scope="col">Email</th>
            <th scope="col">Joined</th>
            <th scope="col">Last message</th>
            <th scope="col">Conversations</th>
            <th scope="col">Messages</th>
            <th scope="col">Agents</th>
            <th scope="col">Admin</th>
          </tr>
        </thead>
        <tbody>
          {#each data.users as user (user.id)}
            <tr class="border-t">
              <th scope="row" class="font-normal">{user.username}</th>
              <td>{user.email ?? "none"}</td>
              <td>{formatDate(user.createdAt)}</td>
              <td>{formatDate(user.lastActiveAt)}</td>
              <td>
                <a href={`/admin/conversations?user=${user.id}`}
                  >{user.conversations.toLocaleString()}</a
                >
              </td>
              <td>{user.messages.toLocaleString()}</td>
              <td>{user.agents.toLocaleString()}</td>
              <td>
                {#if user.id === data.currentUserId}
                  Yes (you)
                {:else}
                  <form method="POST" action="?/setAdmin" use:enhance>
                    <input type="hidden" name="id" value={user.id} />
                    <input type="hidden" name="isAdmin" value={String(!user.isAdmin)} />
                    <Button type="submit" variant="outline" size="sm">
                      {user.isAdmin
                        ? `Remove admin from ${user.username}`
                        : `Make ${user.username} admin`}
                    </Button>
                  </form>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
