import { z } from "zod";
import type { Result } from "@/shared/errors/application-error";
const errorSchema = z.object({
  code: z.string(),
  category: z.enum([
    "validation",
    "unauthenticated",
    "forbidden",
    "not_found",
    "conflict",
    "unavailable",
    "unexpected",
  ]),
  message: z.string(),
  reference: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
});
export async function readCommandResult<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<Result<T>> {
  const result = z
    .discriminatedUnion("ok", [
      z.object({ ok: z.literal(true), value: schema }),
      z.object({ ok: z.literal(false), error: errorSchema }),
    ])
    .safeParse(await response.json());
  if (!result.success) throw new Error("INVALID_COMMAND_RESPONSE");
  return result.data;
}
export const commandNoticeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("session-ended") }),
  z.object({
    type: z.literal("order"),
    id: z.uuid(),
    version: z.number().int().positive(),
  }),
]);
