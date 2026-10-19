<script lang="ts">
  import katex from "katex";
  import "katex/dist/katex.min.css";

  interface Props {
    tex: string;
    display?: boolean;
  }

  const { tex, display = false }: Props = $props();

  // KaTeX escapes the TeX source itself, so its output is safe to inject.
  // Invalid TeX is shown as-is in red rather than throwing, which also covers
  // half-written expressions while a reply is streaming. The output includes
  // MathML, which is what screen readers announce.
  const html = $derived(
    katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      output: "htmlAndMathml",
      strict: "ignore"
    })
  );
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX output, source is escaped -->
{@html html}
