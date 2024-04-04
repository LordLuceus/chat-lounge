import { z } from "zod";

export const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  instructions: z.string().min(2)
});

export type FormSchema = typeof formSchema;
