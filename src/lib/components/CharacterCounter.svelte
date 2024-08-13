<script lang="ts">
  import { toast } from "svelte-sonner";
  import Toast from "./Toast.svelte";

  export let characterLimit: number | undefined;
  export let value: string;

  $: if (value?.length >= characterLimit!) {
    toast.error(Toast, {
      componentProps: {
        text: `You've reached the character limit of ${characterLimit} characters.`
      }
    });
  }
</script>

<p>
  {value?.length || 0}/{characterLimit} characters
</p>
