<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Textarea } from "$lib/components/ui/textarea";

  export let id: string;
  export let content: string;
  export let onSubmit: (id: string, content: string, regenerate: boolean) => void;

  let open = false;
  $: value = content;
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>Edit message</Dialog.Trigger>
  <Dialog.Content>
    <Textarea bind:value placeholder="Type your message..." rows={1} cols={200} autofocus />
    <Button
      on:click={() => {
        onSubmit(id, value, true);
        open = false;
      }}>Edit</Button
    >
    <Button
      on:click={() => {
        onSubmit(id, value, false);
        open = false;
      }}>Edit (no regeneration)</Button
    >
  </Dialog.Content>
</Dialog.Root>
