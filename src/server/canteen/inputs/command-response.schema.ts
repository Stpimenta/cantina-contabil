import { z } from "zod";
import { commandIdSchema } from "./command.input";
export const commandResponseSchema = z.object({
  id: commandIdSchema,
  version: z.number().int().positive(),
  customerName: z.string(),
  note: z.string(),
  createdAt: z.string(),
  collected: z.boolean(),
  paid: z.boolean(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      icon: z.string(),
    }),
  ),
});
export const commandPageSchema = z.object({
  eventId: commandIdSchema,
  eventName: z.string(),
  items: z.array(commandResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.literal(15),
  query: z.string(),
  collected: z.enum(["all", "waiting", "collected"]),
});
export const commandWindowSchema = z.object({
  order: commandResponseSchema.nullable(),
  window: z.object({
    ids: z.array(commandIdSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
  }),
});
