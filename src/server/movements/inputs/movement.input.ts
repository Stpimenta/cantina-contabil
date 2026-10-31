import {
  RECEIPT_MAX_FILES,
  receiptListSchema,
} from "@/shared/receipts/receipt-input";
import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { moneyInputSchema } from "@/shared/validation/money-input";
import { isDateOnly } from "@/shared/dates/date-only";
import { pageInputSchema } from "@/shared/validation/page-input";
const fields = z.object({
  cashBoxId: z.uuid(),
  direction: z.enum(["incoming", "outgoing"]),
  amount: moneyInputSchema.pipe(
    z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  ),
  occurredOn: z.string().refine(isDateOnly),
  reason: z.string().trim().min(1).max(500),
  receipts: receiptListSchema.default([]),
  retainedReceiptIds: z
    .array(z.uuid())
    .max(RECEIPT_MAX_FILES)
    .refine((ids) => new Set(ids).size === ids.length)
    .default([]),
});
const issues = {
  cashBoxId: "CASH_BOX_REQUIRED",
  direction: "INVALID_MOVEMENT_DIRECTION",
  amount: "INVALID_AMOUNT",
  occurredOn: "INVALID_DATE",
  reason: "INVALID_MOVEMENT_REASON",
  receipts: "INVALID_MOVEMENT_RECEIPT",
  retainedReceiptIds: "INVALID_MOVEMENT_RECEIPT",
} as const;
export const validateMovement = (input: unknown) =>
  validateInput(fields, input, "INVALID_MOVEMENT_INPUT", issues);
export const validateMovementCreate = (input: unknown) =>
  validateInput(
    fields.extend({ requestId: z.uuid() }),
    input,
    "INVALID_MOVEMENT_INPUT",
    issues,
  );
export const validateMovementUpdate = (input: unknown) =>
  validateInput(
    fields.extend({
      id: z.uuid(),
      version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    }),
    input,
    "MOVEMENT_CHANGED",
    issues,
  );
export const validateMovementReference = (input: unknown) =>
  validateInput(
    z.object({
      id: z.uuid(),
      version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    }),
    input,
    "MOVEMENT_CHANGED",
  );
export const validateMovementList = (input: unknown) =>
  validateInput(z.object({ page: pageInputSchema }), input, "INVALID_FILTER");

export const validateMovementReceiptReference = (input: unknown) =>
  validateInput(
    z.object({ id: z.uuid(), receiptId: z.uuid() }),
    input,
    "RECEIPT_NOT_FOUND",
  );
