import { env } from "$env/dynamic/private";
import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

export const fetchWebpage = tool({
  description:
    "Fetch the content of a specific webpage by URL. Use this when you need to read the full content of a page, either from a URL the user provided or one discovered via web search.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL of the webpage to fetch")
  }),
  execute: async ({ url }) => {
    try {
      if (!env.EXA_API_KEY) {
        return {
          success: false,
          message: "EXA_API_KEY is not configured. Please add it to your .env file."
        };
      }

      const exa = new Exa(env.EXA_API_KEY);
      const { results } = await exa.getContents([url], {
        text: true,
        summary: true
      });

      if (!results || results.length === 0) {
        return {
          success: false,
          message: "Could not fetch content from the provided URL."
        };
      }

      const result = results[0];
      return {
        success: true,
        title: result.title,
        url: result.url,
        summary: result.summary,
        content: result.text,
        author: result.author,
        publishedDate: result.publishedDate
      };
    } catch (error) {
      return {
        success: false,
        message: `Fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});
