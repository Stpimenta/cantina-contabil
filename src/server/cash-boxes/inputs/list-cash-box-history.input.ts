import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { pageInputSchema } from "@/shared/validation/page-input";
import { cashBoxIdInputSchema } from "./cash-box-reference.input";

export const listCashBoxHistoryInputSchema = z.object({
  id: cashBoxIdInputSchema,
  page: pageInputSchema,
  category: z.enum(["all", "events", "incoming", "outgoing"]).catch("all"),
});
export function validateListCashBoxHistory(input: unknown) {
  return validateInput(listCashBoxHistoryInputSchema, input, "INVALID_FILTER");
}
