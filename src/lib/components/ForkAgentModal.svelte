<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import type { Agent } from "@prisma/client";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { toast } from "svelte-sonner";

  interface Props {
    agent: Agent;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onForkSuccess?: (forkedAgent: Agent) => void;
  }

  const { agent, open, onOpenChange, onForkSuccess }: Props = $props();

  let customName = $state(`Copy of ${agent.name}`);

  const client = useQueryClient();

  const forkMutation = $derived(
    createMutation(() => ({
      mutationFn: async (data: { name: string }) => {
        const response = await fetch(`/api/agents/${agent.id}/fork`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: data.name })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to fork agent");
        }

        return response.json();
      },
      onSuccess: (data) => {
        client.invalidateQueries({ queryKey: ["agents"] });
        onOpenChange(false);
        toast.success(`Forked "${agent.name}" successfully!`);
        onForkSuccess?.(data.agent);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to fork agent");
      }
    }))
  );

  function handleFork() {
    forkMutation.mutate({ name: customName });
  }

  function handleCancel() {
    customName = `Copy of ${agent.name}`;
    onOpenChange(false);
  }
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="sm:max-w-[525px]">
    <Dialog.Header>
      <Dialog.Title>Fork Agent</Dialog.Title>
      <Dialog.Description>
        Create your own copy of "{agent.name}"
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">
          Forking will create a private copy of this agent that you can edit and customize. This is
          a snapshot at the time of forking - any future updates to the original agent won't sync to
          your copy.
        </p>
      </div>

      <div class="space-y-2">
        <Label for="fork-name">Agent Name</Label>
        <Input
          id="fork-name"
          bind:value={customName}
          placeholder="Enter name for your forked agent"
        />
      </div>

      <div class="rounded-lg border border-border bg-muted/50 p-3">
        <p class="text-sm font-medium">What gets copied:</p>
        <ul class="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Instructions (system prompt)</li>
          <li>Description and greeting (if applicable)</li>
          <li>Agent type and verbosity settings</li>
          <li>Preferred model (if set)</li>
        </ul>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={handleCancel} disabled={forkMutation.isPending}>
        Cancel
      </Button>
      <Button onclick={handleFork} disabled={forkMutation.isPending || !customName.trim()}>
        {forkMutation.isPending ? "Forking..." : "Fork Agent"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
