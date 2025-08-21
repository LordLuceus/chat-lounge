<script lang="ts">
  import { Check, Minus } from "@lucide/svelte";
  import { cn } from "$lib/utils.js";

  interface Props {
    checked?: boolean;
    indeterminate?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
    disabled?: boolean;
    class?: string;
  }

  let {
    checked = false,
    indeterminate = false,
    onCheckedChange,
    id,
    disabled = false,
    class: className
  }: Props = $props();

  function handleClick() {
    if (disabled) return;
    if (onCheckedChange) {
      onCheckedChange(!checked);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      handleClick();
    }
  }
</script>

<div
  role="checkbox"
  tabindex="0"
  aria-checked={indeterminate ? "mixed" : checked}
  {id}
  class={cn(
    "peer flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    checked && !indeterminate && "bg-primary text-primary-foreground",
    disabled && "cursor-not-allowed opacity-50",
    className
  )}
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  {#if indeterminate}
    <Minus class="h-3 w-3" />
  {:else if checked}
    <Check class="h-3 w-3" />
  {/if}
</div>
