import { productIcons } from "@/shared/products/product-icons";
import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { moneyInputSchema } from "@/shared/validation/money-input";
import {
  RECEIPT_MAX_FILES,
  receiptListSchema,
} from "@/shared/receipts/receipt-input";
export {
  RECEIPT_MAX_FILES,
  RECEIPT_MAX_BYTES,
  RECEIPT_TYPES,
  receiptMetadata,
} from "@/shared/receipts/receipt-input";
const supplyFieldsSchema = z.object({
  requestId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  donorName: z.string().trim().max(100).default(""),
  description: z.string().trim().max(500).default(""),
  icon: z.enum(productIcons.map((icon) => icon.id)),
  amount: moneyInputSchema,
  source: z.enum(["purchase", "donation"]),
  cashBoxId: z.string().min(1).nullable(),
  received: z.boolean(),
  receipts: receiptListSchema,
});
export const createSupplyInputSchema = supplyFieldsSchema.superRefine(
  (data, ctx) => {
    if (data.source === "purchase") {
      if (!data.cashBoxId)
        ctx.addIssue({ code: "custom", path: ["cashBoxId"] });
      if (!data.receipts.length)
        ctx.addIssue({ code: "custom", path: ["receipts"] });
      if (data.amount === 0) ctx.addIssue({ code: "custom", path: ["amount"] });
      if (!data.received) ctx.addIssue({ code: "custom", path: ["received"] });
    } else if (data.cashBoxId !== null)
      ctx.addIssue({ code: "custom", path: ["cashBoxId"] });
  },
);
export type CreateSupplyInput = z.input<typeof createSupplyInputSchema>;
export function validateCreateSupply(input: unknown) {
  return validateInput(createSupplyInputSchema, input, "INVALID_SUPPLY_INPUT", {
    name: "INVALID_SUPPLY_NAME",
    description: "DESCRIPTION_TOO_LONG",
    donorName: "DONOR_NAME_TOO_LONG",
    icon: "INVALID_SUPPLY_ICON",
    amount: "INVALID_SUPPLY_AMOUNT",
    source: "INVALID_SUPPLY_SOURCE",
    cashBoxId: "CASH_BOX_REQUIRED",
    received: "INVALID_SUPPLY_STATUS",
    receipts: "INVALID_RECEIPT",
    retainedReceiptIds: "INVALID_RECEIPT",
  });
}
export const updateSupplyInputSchema = createSupplyInputSchema.safeExtend({
  version: z.number().int().positive(),
  retainedReceiptIds: z
    .array(z.uuid())
    .max(RECEIPT_MAX_FILES)
    .refine((ids) => new Set(ids).size === ids.length),
});
export function validateUpdateSupply(input: unknown) {
  return validateInput(updateSupplyInputSchema, input, "INVALID_SUPPLY_INPUT", {
    name: "INVALID_SUPPLY_NAME",
    description: "DESCRIPTION_TOO_LONG",
    donorName: "DONOR_NAME_TOO_LONG",
    icon: "INVALID_SUPPLY_ICON",
    amount: "INVALID_SUPPLY_AMOUNT",
    source: "INVALID_SUPPLY_SOURCE",
    cashBoxId: "CASH_BOX_REQUIRED",
    received: "INVALID_SUPPLY_STATUS",
    receipts: "INVALID_RECEIPT",
    retainedReceiptIds: "INVALID_RECEIPT",
  });
}

const updateSupplyFieldsSchema = supplyFieldsSchema
  .omit({ requestId: true, receipts: true })
  .extend({
    version: z.number().int().positive(),
    retainedReceiptIds: z
      .array(z.uuid())
      .max(RECEIPT_MAX_FILES)
      .refine((ids) => new Set(ids).size === ids.length),
  });
export function validateSupplyUpdateFields(input: unknown) {
  return validateInput(
    updateSupplyFieldsSchema,
    input,
    "INVALID_SUPPLY_INPUT",
    {
      name: "INVALID_SUPPLY_NAME",
      description: "DESCRIPTION_TOO_LONG",
      donorName: "DONOR_NAME_TOO_LONG",
      icon: "INVALID_SUPPLY_ICON",
      amount: "INVALID_SUPPLY_AMOUNT",
      source: "INVALID_SUPPLY_SOURCE",
      cashBoxId: "CASH_BOX_REQUIRED",
      received: "INVALID_SUPPLY_STATUS",
      retainedReceiptIds: "INVALID_RECEIPT",
    },
  );
}
