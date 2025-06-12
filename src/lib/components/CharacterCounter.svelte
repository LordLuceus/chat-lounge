<script lang="ts">
  import { run } from "svelte/legacy";

  import { toast } from "svelte-sonner";
  import Toast from "./Toast.svelte";

  interface Props {
    characterLimit: number | undefined;
    value: string;
  }

  let { characterLimit, value }: Props = $props();

  run(() => {
    if (value?.length >= characterLimit!) {
      toast.error(Toast, {
        componentProps: {
          text: `You've reached the character limit of ${characterLimit} characters.`
        }
      });
    }
  });
</script>

<p>
  {value?.length || 0}/{characterLimit} characters
</p>
