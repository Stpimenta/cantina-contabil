import type { Session } from "@/server/auth/models/session.model";
import type { Event } from "@/server/events/models/event.model";
import type { EventOrder } from "@/server/events/models/event-order.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import { throwBusinessError } from "@/shared/errors/business-error";
import { orderStockConsumption } from "../models/order-stock";
import {
  changedStockProducts,
  stockContext,
} from "../models/shared-stock.model";
import { stockShortages } from "../models/stock-shortages";
import type { StockEntry } from "../models/stock-entry.model";
import type { StockConfirmation } from "../inputs/stock-confirmation.input";
import type { SharedStockRepository } from "../repositories/shared-stock.repository";
import { checkStockMembers } from "./shared-stock-access";

// Callers authorize the user/temporary credential and the order before entering here.
// Temporary actors may consume existing stock, but never attest replenishment.
export async function prepareOrderStock(
  session: Session | null,
  shared: SharedStockRepository | undefined,
  events: EventRepository,
  event: Event,
  current: EventOrder | null,
  order: EventOrder,
  confirmation?: StockConfirmation,
  temporary = false,
) {
  const desired = orderStockConsumption(event, order);
  const previous = orderStockConsumption(event, current);
  const changed = changedStockProducts(desired, previous);
  const members =
    shared && changed.length ? await shared.members(event.id, changed) : [];
  if (!temporary) {
    checkEventAccessWrite(session, event);
    if (event.kind === "product_category")
      checkStockMembers(session, members, true);
  }
  const context = members.length ? stockContext(members) : null;
  const additions: (StockEntry & { expectedAvailable: number })[] = [];
  if (confirmation) {
    if (temporary || !changed.length)
      throwBusinessError({
        code: "INVALID_STOCK_INPUT",
        category: "validation",
      });
    const actor = checkEventAccessWrite(session, event).user;
    // Replenishment retains the existing joint authorization policy.
    checkStockMembers(session, members, true);
    const shortages = stockShortages(
      order.items,
      desired,
      previous,
      await events.orderStockBalances(event.id),
    );
    if (
      shortages.length !== confirmation.length ||
      new Set(confirmation.map((item) => item.productId)).size !==
        confirmation.length ||
      shortages.some(
        (item) =>
          !confirmation.some(
            (c) =>
              c.productId === item.productId &&
              c.missing === item.missing &&
              c.available === item.available,
          ),
      )
    )
      throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
    for (const item of shortages)
      additions.push({
        stockContext: context,
        id: crypto.randomUUID(),
        eventId: event.id,
        productId: item.productId,
        quantity: item.missing,
        expectedAvailable: item.available,
        version: 1,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null,
        createdAt: order.updatedAt,
        updatedAt: order.updatedAt,
        createdBy: actor.id,
        createdByName: actor.name,
        updatedBy: actor.id,
        updatedByName: actor.name,
        lastOperation: order.lastOperation,
        fingerprint: JSON.stringify({
          operation: "confirmStockAndWithdraw",
          orderId: order.id,
          requestId: order.lastOperation,
          productId: item.productId,
          quantity: item.missing,
        }),
      });
  }
  return { context, additions };
}
