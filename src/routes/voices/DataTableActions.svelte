<script lang="ts">
  import MoreHorizontal from "lucide-svelte/icons/more-horizontal";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { toast } from "svelte-sonner";
  import { page } from "$app/stores";

  export let id: string;

  let setDefaultError = false;
  let setDefaultSuccess = false;
  let copyIdSuccess = false;

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

      setDefaultSuccess = true;
    } catch (error) {
      setDefaultError = true;
    }
  }

  async function copyId() {
    await navigator.clipboard.writeText(id);
    copyIdSuccess = true;
  }

  $: {
    if (setDefaultSuccess) {
      toast.success("Voice set as default");
      setDefaultSuccess = false;
    }

    if (setDefaultError) {
      toast.error("Failed to set voice as default");
      setDefaultError = false;
    }

    if (copyIdSuccess) {
      toast.success("Voice ID copied to clipboard");
      copyIdSuccess = false;
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
      <DropdownMenu.Item on:click={copyId}>Copy voice ID</DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
