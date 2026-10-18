import TexMath from "$lib/components/TexMath.svelte";
import remarkMath from "remark-math";
import type { HastElement, HastNode, Plugin } from "svelte-exmarkdown";

/**
 * remark-math turns `$…$` into `<code class="language-math math-inline">`
 * and `$$ … $$` blocks into `<pre><code class="language-math math-display">`.
 * This swaps both for a `tex-math` element that the TexMath component
 * renders with KaTeX. Inline `$$…$$` (what models write for display maths
 * mid-paragraph) is rendered in display mode too; the delimiter is read back
 * from the source, as the AST does not record it.
 */
export const mathPlugin: Plugin = {
  remarkPlugin: [remarkMath],
  rehypePlugin: rehypeTexMath,
  renderer: { "tex-math": TexMath }
};

type Positioned = { position?: { start: { offset?: number } } };

function rehypeTexMath() {
  return (tree: HastNode, file: { value: unknown }) => {
    const source = String(file.value);

    const classes = (node: HastElement): string[] => {
      const className = node.properties?.className;
      return Array.isArray(className) ? className.map(String) : [];
    };

    const mathCode = (node: HastNode | undefined): HastElement | null =>
      node?.type === "element" && node.tagName === "code" && classes(node).includes("language-math")
        ? node
        : null;

    const textOf = (node: HastElement): string =>
      node.children.map((child) => (child.type === "text" ? child.value : "")).join("");

    const isDisplay = (code: HastElement): boolean => {
      if (classes(code).includes("math-display")) return true;
      const offset = (code as Positioned).position?.start.offset;
      return offset !== undefined && source.startsWith("$$", offset);
    };

    const transform = (parent: { children?: HastNode[] }) => {
      const children = parent.children;
      if (!children) return;
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.type !== "element") continue;
        const code =
          node.tagName === "pre" && node.children.length === 1
            ? mathCode(node.children[0])
            : mathCode(node);
        if (code) {
          children[i] = {
            type: "element",
            tagName: "tex-math",
            properties: { tex: textOf(code), display: isDisplay(code) },
            children: []
          } as HastElement;
          continue;
        }
        transform(node);
      }
    };

    transform(tree);
  };
}
