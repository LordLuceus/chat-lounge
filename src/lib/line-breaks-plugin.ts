import remarkBreaks from "remark-breaks";
import type { Plugin } from "svelte-exmarkdown";

export const lineBreaksPlugin: Plugin = { remarkPlugin: [remarkBreaks] };
