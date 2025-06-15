<script lang="ts">
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { newVersionAvailable } from "$lib/stores";

  let showPopup = $derived($newVersionAvailable);
</script>

<Dialog.Root bind:open={showPopup}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>ChatLounge has been updated</Dialog.Title>
    </Dialog.Header>
    <Dialog.Description>
      A new version of ChatLounge is available. Click the button below to check out what we've been
      up to.
    </Dialog.Description>
    <Dialog.Footer>
      <Button
        onclick={() => {
          $newVersionAvailable = false;
          goto("/changelog");
        }}>See what's new</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
