import { z } from "zod";

export const agentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  instructions: z.string().min(2)
});

export const deleteSchema = z.object({
  id: z.string()
});

export type AgentSchema = typeof agentSchema;
export type DeleteSchema = typeof deleteSchema;
