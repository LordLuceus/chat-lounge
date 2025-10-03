import { tool } from "ai";
import { z } from "zod";

export const currentTime = tool({
  description:
    "Get the current date and time. Optionally specify a timezone to get the time in that timezone.",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe(
        "Optional timezone in IANA format (e.g., 'America/New_York', 'Europe/London'). Defaults to UTC."
      )
  }),
  execute: async ({ timezone }) => {
    const now = new Date();

    let timeString: string;
    let dateString: string;

    if (timezone) {
      try {
        timeString = now.toLocaleTimeString("en-US", { timeZone: timezone, hour12: true });
        dateString = now.toLocaleDateString("en-US", {
          timeZone: timezone,
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      } catch (error) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }
    } else {
      timeString = now.toUTCString().split(" ")[4] + " UTC";
      dateString = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }

    return {
      timezone: timezone || "UTC",
      time: timeString,
      date: dateString,
      timestamp: now.toISOString()
    };
  }
});
