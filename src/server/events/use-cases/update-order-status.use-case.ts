import { stockShortages } from "@/server/products/models/stock-shortages";
import type { StockEntry } from "@/server/products/models/stock-entry.model";
import { checkEventAccessWrite } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import { throwBusinessError } from "@/shared/errors/business-error";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import {
  validateEventId,
  validateEventVersion,
} from "../inputs/event-query.input";
import { validateUpdateOrderStatus } from "../inputs/update-order-status.input";
import type { EventRepository } from "../repositories/event.repository";
import {
  eventMissing,
  eventChanged,
  checkRepeat,
  checkEventWrite,
} from "../models/event-rules";
export class UpdateOrderStatusUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(
    session: Session | null,
    eventIdInput: unknown,
    idInput: unknown,
    versionInput: unknown,
    input: unknown,
  ) {
    const actor = checkAccess(session).user;
    const eventId = parseInput(validateEventId(eventIdInput));
    const id = parseInput(validateEventId(idInput));
    const expected = parseInput(validateEventVersion(versionInput));
    const data = parseInput(validateUpdateOrderStatus(input));
    const fingerprint = JSON.stringify({
      operation: "updateOrderStatus",
      eventId,
      id,
      expected,
      ...data,
    });
    const authorizedEvent = await this.events.find(eventId);
    if (!authorizedEvent) return eventMissing();
    checkEventAccessWrite(session, authorizedEvent);
    const current = await this.events.findOrder(id);
    if (!current || current.eventId !== eventId) return eventMissing();
    if (checkRepeat(current, data.requestId, fingerprint, actor.id))
      return current;
    if (current.version !== expected || (data.payment && current.paid))
      return eventChanged();
    parseInput(validateUpdateOrderStatus(input, current.totalCents));
    const event = authorizedEvent;
    const usesWithdrawals = !event.deliveryEnabled && !event.canteenEnabled;
    if (data.fulfilled !== undefined) {
      if (!usesWithdrawals && !event.deliveryEnabled)
        throwBusinessError({
          code: "EVENT_DELIVERY_DISABLED",
          category: "conflict",
        });
      if (!usesWithdrawals && !current.fulfillmentMode)
        throwBusinessError({
          code: "ORDER_FULFILLMENT_UNDEFINED",
          category: "conflict",
        });
    }
    if (!data.payment && data.fulfilled === undefined) return current;
    const cashCents = !data.payment
      ? current.cashCents
      : data.payment.method === "cash"
        ? current.totalCents
        : data.payment.method === "mixed"
          ? data.payment.cash
          : 0;
    const order = {
      ...current,
      ...(current.updatedActor
        ? {
            updatedActor: {
              kind: "user" as const,
              id: actor.id,
              name: actor.name,
              expiresAt: session!.expiresAt,
            },
          }
        : {}),
      paid: data.payment ? true : current.paid,
      fulfilled: usesWithdrawals
        ? false
        : (data.fulfilled ?? current.fulfilled),
      ...(usesWithdrawals && data.fulfilled !== undefined
        ? {
            withdrawals: current.items.map((item) => ({
              productId: item.id,
              quantity: data.fulfilled ? item.quantity : 0,
            })),
          }
        : {}),
      cashCents,
      pixCents: data.payment
        ? current.totalCents - cashCents
        : current.pixCents,
      version: expected + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.id,
      updatedByName: actor.name,
      lastOperation: data.requestId,
      fingerprint,
    };
    const additions: (StockEntry & { expectedAvailable: number })[] = [];
    if (data.stockConfirmation) {
      if (event.kind !== "product_category" || !usesWithdrawals)
        throwBusinessError({
          code: "INVALID_STOCK_INPUT",
          category: "validation",
        });
      const shortages = stockShortages(
        current.items,
        current.items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        current.withdrawals ?? [],
        await this.events.orderStockBalances(eventId),
      );
      if (
        shortages.length !== data.stockConfirmation.length ||
        new Set(data.stockConfirmation.map((item) => item.productId)).size !==
          data.stockConfirmation.length ||
        shortages.some(
          (item) =>
            !data.stockConfirmation!.some(
              (confirmed) =>
                confirmed.productId === item.productId &&
                confirmed.missing === item.missing &&
                confirmed.available === item.available,
            ),
        )
      )
        throwBusinessError({ code: "STOCK_CHANGED", category: "conflict" });
      for (const item of shortages) {
        additions.push({
          id: crypto.randomUUID(),
          eventId,
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
          lastOperation: data.requestId,
          fingerprint: JSON.stringify({
            operation: "confirmStockAndWithdraw",
            orderId: id,
            requestId: data.requestId,
            productId: item.productId,
            quantity: item.missing,
          }),
        });
      }
    }
    const outcome = await this.events.updateOrder(
      order,
      expected,
      event.version,
      additions,
    );
    if (outcome === "stale") {
      const saved = await this.events.findOrder(id);
      if (checkRepeat(saved, data.requestId, fingerprint, actor.id))
        return saved!;
    }
    checkEventWrite(outcome);
    return order;
  }
}
