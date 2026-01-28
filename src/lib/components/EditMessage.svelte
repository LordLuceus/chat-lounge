<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Textarea } from "$lib/components/ui/textarea";
  import type { UIDataTypes, UIMessagePart, UITools } from "ai";
  import { untrack } from "svelte";

  interface Props {
    id: string;
    parts: UIMessagePart<UIDataTypes, UITools>[];
    onSubmit: (
      id: string,
      parts: UIMessagePart<UIDataTypes, UITools>[],
      regenerate: boolean
    ) => void;
  }

  const { id, parts, onSubmit }: Props = $props();

  let open = $state(false);

  // Extract text content for editing
  const textContent = untrack(() => parts)
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");

  let value = $state(textContent);

  // Preserve non-text parts (like images)
  const nonTextParts = untrack(() => parts).filter((part) => part.type !== "text");

  function handleSubmit(regenerate: boolean) {
    // Combine edited text with preserved non-text parts
    const newParts: UIMessagePart<UIDataTypes, UITools>[] = [
      { type: "text", text: value },
      ...nonTextParts
    ];
    onSubmit(id, newParts, regenerate);
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>Edit message</Dialog.Trigger>
  <Dialog.Content>
    <Textarea bind:value placeholder="Type your message..." rows={1} cols={200} autofocus />
    <Button onclick={() => handleSubmit(true)}>Edit</Button>
    <Button onclick={() => handleSubmit(false)}>Edit (no regeneration)</Button>
  </Dialog.Content>
</Dialog.Root>
