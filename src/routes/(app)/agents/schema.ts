import { z } from "zod";

export const agentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  instructions: z.string().min(2),
  visibility: z.enum(["public", "private", "hidden"]),
  type: z.enum(["default", "character"]),
  verbosity: z.enum(["concise", "default", "verbose"]).optional().nullable(),
  greeting: z.string().optional().nullable(),
  preferredModel: z
    .object({
      value: z.string(),
      label: z.string()
    })
    .optional()
    .nullable()
});

export type AgentSchema = typeof agentSchema;
