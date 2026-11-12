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
    const current = await this.events.findOrder(id);
    if (!current || current.eventId !== eventId) return eventMissing();
    if (checkRepeat(current, data.requestId, fingerprint, actor.id))
      return current;
    if (current.version !== expected || (data.payment && current.paid))
      return eventChanged();
    parseInput(validateUpdateOrderStatus(input, current.totalCents));
    const event = await this.events.find(eventId);
    if (!event) return eventMissing();
    if (data.fulfilled !== undefined) {
      if (!event.deliveryEnabled)
        throwBusinessError({
          code: "EVENT_DELIVERY_DISABLED",
          category: "conflict",
        });
      if (!current.fulfillmentMode)
        throwBusinessError({
          code: "ORDER_FULFILLMENT_UNDEFINED",
          category: "conflict",
        });
    }
    if (!data.payment && data.fulfilled === current.fulfilled) return current;
    const cashCents = !data.payment
      ? current.cashCents
      : data.payment.method === "cash"
        ? current.totalCents
        : data.payment.method === "mixed"
          ? data.payment.cash
          : 0;
    const order = {
      ...current,
      paid: data.payment ? true : current.paid,
      fulfilled: data.fulfilled ?? current.fulfilled,
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
    const outcome = await this.events.updateOrder(
      order,
      expected,
      event.version,
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
