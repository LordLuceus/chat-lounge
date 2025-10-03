import { env } from "$env/dynamic/private";
import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

export const webSearch = tool({
  description:
    "Search the web for up-to-date information. Use this when you need current information, news, or facts that may have changed recently.",
  inputSchema: z.object({
    query: z.string().min(1).max(100).describe("The search query to find relevant web content")
  }),
  execute: async ({ query }) => {
    try {
      if (!env.EXA_API_KEY) {
        return {
          success: false,
          message: "EXA_API_KEY is not configured. Please add it to your .env file."
        };
      }

      const exa = new Exa(env.EXA_API_KEY);
      const { results } = await exa.searchAndContents(query, {
        livecrawl: "always",
        numResults: 5
      });

      if (!results || results.length === 0) {
        return {
          success: false,
          message: "No results found for the query."
        };
      }

      return {
        success: true,
        results: results.map((result) => ({
          title: result.title,
          url: result.url,
          content: result.text,
          publishedDate: result.publishedDate
        }))
      };
    } catch (error) {
      return {
        success: false,
        message: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});
