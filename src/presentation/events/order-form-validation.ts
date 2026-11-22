import {
  validateSaveOrder,
  validateOrderSection,
} from "@/server/events/inputs/save-order.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import type { ApplicationError } from "@/shared/errors/application-error";
export const orderSteps = [
  "Pedido",
  "Entrega ou retirada",
  "Pagamento",
] as const;
export function orderStepForField(field: string): number {
  const root = field.split(".")[0];
  if (
    ["fulfillmentMode", "fulfilled", "contactPhone", "address"].includes(root)
  )
    return 1;
  if (
    ["total", "paid", "cash", "pix", "receipts", "retainedReceiptIds"].includes(
      root,
    )
  )
    return 2;
  return 0;
}
export function validateOrderForm(
  input: unknown,
  deliveryEnabled: boolean,
  step?: number,
  pickupRequired = false,
): ApplicationError | null {
  const result =
    step === undefined
      ? validateSaveOrder(input, deliveryEnabled, pickupRequired)
      : validateOrderSection(
          input,
          step === 0 ? "details" : step === 1 ? "fulfillment" : "payment",
          pickupRequired,
        );
  if (result.ok) return null;
  const error = presentBusinessFailure(result.error);
  if (step === undefined || !error.fields) return error;
  const fields = Object.fromEntries(
    Object.entries(error.fields).filter(
      ([field]) => orderStepForField(field) === step,
    ),
  );
  return Object.keys(fields).length ? { ...error, fields } : null;
}
export function firstOrderErrorStep(error: ApplicationError): number | null {
  const fields = Object.keys(error.fields ?? {});
  return fields.length ? Math.min(...fields.map(orderStepForField)) : null;
}
