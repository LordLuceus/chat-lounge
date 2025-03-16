<script lang="ts">
  import { page } from "$app/stores";
  import * as Dialog from "$lib/components/ui/dialog";
  import FolderForm from "./FolderForm.svelte";
</script>

<Dialog.Root>
  <Dialog.Trigger>Create Folder</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Create a new folder</Dialog.Title>
    </Dialog.Header>
    <FolderForm data={$page.data.form} />
  </Dialog.Content>
</Dialog.Root>
