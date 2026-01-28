<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Accordion from "$lib/components/ui/accordion";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Info } from "@lucide/svelte";
  import { tick } from "svelte";
  import type { ActionData } from "../../routes/(app)/settings/$types";

  interface Props {
    useBaseInstructions?: boolean;
    customBaseInstructions?: string | null;
    form?: ActionData;
  }

  const { useBaseInstructions = false, customBaseInstructions = null, form }: Props = $props();

  let isEnabled = $state(false);
  let customPrompt = $state<string | null>(null);

  $effect(() => {
    isEnabled = useBaseInstructions;
  });

  $effect(() => {
    customPrompt = customBaseInstructions;
  });

  let isSubmitting = $state(false);

  const baseInstructionsSummary = `The default base instructions provide core behavioral guidelines including:
• Clear, direct communication without artificial contrast patterns ("Not X, but Y")
• Elimination of conversational filler and generic validation ("You're absolutely right", "Great question")
• Critical analysis and objectivity when evaluating user claims
• Commitment to intellectual honesty and admitting knowledge limits
• Instruction hierarchy for handling conflicting directives`;

  function handleToggle() {
    isEnabled = !isEnabled;
  }

  async function handleReset() {
    customPrompt = "";
    await tick();
    const form = document.querySelector('form[action="?/baseInstructions"]');
    if (form) {
      (form as HTMLFormElement).requestSubmit();
    }
  }

  function handleSubmit() {
    isSubmitting = true;
    return async ({ update }: { update: () => Promise<void> }) => {
      await update();
      isSubmitting = false;
    };
  }
</script>

<div class="space-y-6">
  <div class="space-y-4">
    <div class="flex items-center space-x-3">
      <Checkbox id="base-instructions-toggle" checked={isEnabled} onCheckedChange={handleToggle} />
      <Label for="base-instructions-toggle" class="text-sm font-medium">
        Enable Base Instructions
      </Label>
      <Info class="h-4 w-4 text-muted-foreground" />
    </div>

    <p class="text-sm text-muted-foreground">
      Base instructions define core behavioral guidelines for AI responses. When disabled, only
      agent-specific instructions are used.
    </p>

    <div class="space-y-2">
      <Accordion.Root type="single" class="w-full sm:max-w-[70%]">
        <Accordion.Item value="item-1">
          <Accordion.Trigger>What are the default base instructions?</Accordion.Trigger>
          <Accordion.Content>
            {baseInstructionsSummary}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  </div>

  <form method="POST" action="?/baseInstructions" use:enhance={handleSubmit} class="space-y-4">
    <input type="hidden" name="useBaseInstructions" value={isEnabled} />

    {#if isEnabled}
      <div class="space-y-2">
        <Label for="custom-instructions">Custom Base Instructions (Optional)</Label>
        <Textarea
          id="custom-instructions"
          name="customBaseInstructions"
          placeholder="Enter your custom base instructions here to override the default ones..."
          rows={10}
          bind:value={customPrompt}
          class="resize-vertical min-h-[200px]"
        />
        <p class="text-xs text-muted-foreground">
          Leave empty to use the default base instructions. Custom instructions will completely
          replace the defaults.
        </p>
      </div>
    {:else}
      <input type="hidden" name="customBaseInstructions" value="" />
    {/if}

    <div class="flex space-x-2">
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Settings"}
      </Button>

      {#if isEnabled && customPrompt}
        <Button type="button" variant="outline" onclick={handleReset}>Reset to Default</Button>
      {/if}
    </div>

    {#if form?.success}
      <p class="text-sm text-green-600">Base instructions settings saved successfully!</p>
    {/if}

    {#if form?.message && !form?.success}
      <p class="text-sm text-destructive">{form.message}</p>
    {/if}
  </form>
</div>
