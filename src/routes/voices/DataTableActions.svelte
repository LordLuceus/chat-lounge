<script lang="ts">
  import MoreHorizontal from "lucide-svelte/icons/more-horizontal";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { page } from "$app/stores";

  export let id: string;

  let setDefaultError = false;

  async function setDefault() {
    try {
      const res = await fetch(`/api/settings/${$page.data.session?.user?.id}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ voiceId: id })
      });

      if (!res.ok) {
        throw new Error("Failed to set voice as default");
        setDefaultError = true;
      }
    } catch (error) {
      setDefaultError = true;
    }
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild let:builder>
    <Button variant="ghost" builders={[builder]} size="icon" class="relative h-8 w-8 p-0">
      <span class="sr-only">Actions</span>
      <MoreHorizontal class="h-4 w-4" />
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Actions</DropdownMenu.Label>
      <DropdownMenu.Item on:click={setDefault}>Set as default</DropdownMenu.Item>
      <DropdownMenu.Item on:click={() => navigator.clipboard.writeText(id)}>
        Copy voice ID
      </DropdownMenu.Item>
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
  </DropdownMenu.Content>
</DropdownMenu.Root>

{#if setDefaultError}
  <Alert.Root variant="destructive">
    <Alert.Title>Failed to set voice as default</Alert.Title>
    <Alert.Description>
      There was an error while trying to set the voice as default. Please try again later.
    </Alert.Description>
  </Alert.Root>
{/if}
