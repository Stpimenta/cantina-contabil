import { stockImportInputSchema } from "@/server/products/inputs/stock-import.input";
import { z } from "zod";
import { validateInput } from "@/shared/validation/input";
import { moneyInputSchema } from "@/shared/validation/money-input";
import { isDateOnly } from "@/shared/dates/date-only";
import { productIcons } from "@/shared/products/product-icons";
const productSchema = z.object({
  id: z.uuid(),
  name: z
    .string()
    .trim()
    .min(1)
    .refine((v) => v.length <= 100),
  icon: z.enum(productIcons.map((icon) => icon.id)),
  price: moneyInputSchema,
});
export const saveEventInputSchema = z
  .object({
    requestId: z.uuid(),
    kind: z.enum(["event", "product_category"]).default("event"),
    deliveryEnabled: z.boolean().default(false),
    canteenEnabled: z.boolean().default(false),
    cashBoxId: z.string().trim().min(1),
    name: z
      .string()
      .trim()
      .min(1)
      .refine((v) => v.length <= 100),
    description: z
      .string()
      .trim()
      .refine((v) => v.length <= 500),
    occursOn: z.string(),
    stockImports: z.array(stockImportInputSchema).max(100).default([]),
    products: z
      .array(productSchema)
      .max(100)
      .refine(
        (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
      ),
  })
  .refine(
    (data) =>
      data.kind === "product_category"
        ? data.occursOn === ""
        : isDateOnly(data.occursOn),
    { path: ["occursOn"] },
  )
  .refine(
    (data) =>
      data.kind !== "product_category" ||
      (!data.deliveryEnabled && !data.canteenEnabled),
    { path: ["kind"] },
  )
  .refine(
    (data) =>
      !data.stockImports.length ||
      (data.kind === "product_category" &&
        data.stockImports.every((ref) =>
          data.products.some((p) => p.id === ref.productId),
        ) &&
        new Set(data.stockImports.map((ref) => ref.productId)).size ===
          data.stockImports.length &&
        new Set(data.stockImports.map((ref) => ref.operationId)).size ===
          data.stockImports.length),
    { path: ["products"] },
  )
  .refine((data) => !(data.deliveryEnabled && data.canteenEnabled), {
    path: ["canteenEnabled"],
  });
export type SaveEventInput = z.input<typeof saveEventInputSchema>;
export type EventData = z.output<typeof saveEventInputSchema>;
export function validateSaveEvent(input: unknown) {
  const result = validateInput(
    saveEventInputSchema,
    input,
    "INVALID_EVENT_INPUT",
    {
      cashBoxId: "CASH_BOX_REQUIRED",
      name: "INVALID_EVENT_NAME",
      description: "DESCRIPTION_TOO_LONG",
      occursOn: "INVALID_DATE",
      products: "INVALID_EVENT_PRODUCTS",
      stockImports: "INVALID_STOCK_IMPORT",
    },
  );
  if (!result.ok && result.error.issues) {
    for (const property of Object.keys(result.error.issues)) {
      if (property === "stockImports" || property.startsWith("stockImports.")) {
        result.error.issues.stockImports = "INVALID_STOCK_IMPORT";
        if (property !== "stockImports") delete result.error.issues[property];
      } else if (/^products\.\d+\.name$/.test(property))
        result.error.issues[property] = "INVALID_PRODUCT_NAME";
      else if (/^products\.\d+\.price$/.test(property))
        result.error.issues[property] = "INVALID_PRODUCT_PRICE";
      else if (/^products\.\d+\.icon$/.test(property))
        result.error.issues[property] = "INVALID_PRODUCT_ICON";
    }
  }
  return result;
}
