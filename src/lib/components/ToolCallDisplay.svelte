<script lang="ts">
  import type { UIDataTypes, UIMessagePart, UITools } from "ai";

  interface Props {
    part: UIMessagePart<UIDataTypes, UITools>;
  }

  const { part }: Props = $props();

  const isTool = $derived(
    part.type.startsWith("tool-") && part.type !== "tool-call" && part.type !== "tool-result"
  );

  const toolName = $derived(
    isTool && typeof part.type === "string" ? part.type.replace("tool-", "") : ""
  );

  const toolInput = $derived(isTool && "input" in part ? part.input : null);

  const toolOutput = $derived(isTool && "output" in part ? part.output : null);

  const hasOutput = $derived(isTool && "state" in part && part.state === "output-available");
</script>

{#if isTool}
  <aside class="tool-invocation">
    <details>
      <summary class="tool-header" id="tool-header-{toolName}">
        <strong>{toolName}</strong>
      </summary>

      <div role="region" aria-labelledby="tool-header-{toolName}">
        {#if toolInput && Object.keys(toolInput).length > 0}
          <details>
            <summary>View input</summary>
            <pre class="tool-content">{JSON.stringify(toolInput, null, 2)}</pre>
          </details>
        {/if}

        {#if hasOutput && toolOutput}
          <details>
            <summary>View output</summary>
            <pre class="tool-content">{typeof toolOutput === "string"
                ? toolOutput
                : JSON.stringify(toolOutput, null, 2)}</pre>
          </details>
        {/if}
      </div>
    </details>
  </aside>
{/if}

<style>
  .tool-invocation {
    margin: 0.5rem 0;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    padding: 0.75rem;
    background-color: hsl(var(--muted) / 0.3);
  }

  .tool-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .tool-content {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: hsl(var(--background));
    border-radius: 0.25rem;
    overflow-x: auto;
    font-size: 0.875rem;
  }

  details {
    cursor: pointer;
  }

  summary {
    font-size: 0.875rem;
    opacity: 0.8;
    user-select: none;
  }

  summary:hover {
    opacity: 1;
  }
</style>
