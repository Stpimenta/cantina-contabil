import { throwBusinessError } from "@/shared/errors/business-error";
import type { EventWriteOutcome } from "../repositories/event.repository";
import type { EventData } from "../inputs/save-event.input";
import type { OrderData } from "../inputs/save-order.input";
import type { Event } from "./event.model";
import type { EventOrder } from "./event-order.model";
export const eventMissing = () =>
  throwBusinessError({ code: "EVENT_NOT_FOUND", category: "not_found" });
export const eventChanged = () =>
  throwBusinessError({ code: "EVENT_CHANGED", category: "conflict" });
export function checkEventWrite(outcome: EventWriteOutcome) {
  if (outcome === "has_supplies")
    throwBusinessError({ code: "EVENT_HAS_SUPPLIES", category: "conflict" });
  if (outcome === "has_orders")
    throwBusinessError({ code: "EVENT_HAS_ORDERS", category: "conflict" });
  if (outcome === "stale" || outcome === "catalog_changed") eventChanged();
  if (outcome === "box_unavailable")
    throwBusinessError({ code: "CASH_BOX_UNAVAILABLE", category: "conflict" });
  if (outcome === "limit")
    throwBusinessError({ code: "AMOUNT_LIMIT", category: "validation" });
}
export function eventFields(data: EventData) {
  return {
    cashBoxId: data.cashBoxId,
    name: data.name,
    description: data.description,
    occursOn: data.occursOn,
    products: data.products.map(({ price, ...p }) => ({
      ...p,
      priceCents: price,
    })),
  };
}
export function orderFields(
  data: OrderData,
  event: Event,
  current?: EventOrder,
) {
  const items = data.items.map(({ productId, quantity }) => {
    const product =
      current?.items.find((p) => p.id === productId) ??
      event.products.find((p) => p.id === productId);
    if (!product)
      throwBusinessError({
        code: "INVALID_ORDER_PRODUCT",
        category: "conflict",
      });
    return {
      id: product.id,
      name: product.name,
      icon: product.icon,
      priceCents: product.priceCents,
      quantity,
    };
  });
  const subtotal = items.reduce(
    (sum, item) => sum + BigInt(item.priceCents) * BigInt(item.quantity),
    0n,
  );
  if (subtotal > BigInt(Number.MAX_SAFE_INTEGER))
    throwBusinessError({ code: "AMOUNT_LIMIT", category: "validation" });
  return {
    customerName: data.customerName,
    note: data.note,
    items,
    totalCents: data.total,
    paid: data.paid,
    cashCents: data.cash,
    pixCents: data.pix,
  };
}
export function checkRepeat(
  current: {
    lastOperation: string;
    fingerprint: string;
    updatedBy: number;
  } | null,
  requestId: string,
  fingerprint: string,
  actorId: number,
) {
  if (current?.lastOperation !== requestId) return false;
  if (current.fingerprint !== fingerprint || current.updatedBy !== actorId)
    throwBusinessError({
      code: "EVENT_REQUEST_CONFLICT",
      category: "conflict",
    });
  return true;
}
