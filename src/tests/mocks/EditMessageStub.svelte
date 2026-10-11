<script lang="ts">
  // Stand-in for EditMessage without the dialog: an inline textarea and the
  // same two submit buttons, calling onSubmit exactly like the real one.
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

  let value = $state(
    untrack(() => parts)
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n")
  );

  function submit(regenerate: boolean) {
    onSubmit(id, [{ type: "text", text: value }], regenerate);
  }
</script>

<textarea aria-label="Edit message {id}" bind:value></textarea>
<button onclick={() => submit(true)}>Edit {id}</button>
<button onclick={() => submit(false)}>Edit without regeneration {id}</button>
