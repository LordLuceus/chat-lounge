<script lang="ts">
  import { toast } from "svelte-sonner";
  import Toast from "./Toast.svelte";

  interface Props {
    characterLimit: number | undefined;
    value: string;
  }

  const { characterLimit, value }: Props = $props();

  $effect(() => {
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
