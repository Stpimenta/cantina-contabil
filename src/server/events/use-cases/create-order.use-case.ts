import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateSaveOrder } from "../inputs/save-order.input";
import { validateEventId } from "../inputs/event-query.input";
import {
  orderFields,
  checkRepeat,
  checkEventWrite,
  eventChanged,
  eventMissing,
} from "../models/event-rules";
import type { EventOrder } from "../models/event-order.model";
export class CreateOrderUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(
    session: Session | null,
    eventIdInput: unknown,
    input: unknown,
  ) {
    const access = checkAccess(session);
    const eventId = parseInput(validateEventId(eventIdInput));
    const data = parseInput(validateSaveOrder(input));
    const id = data.requestId;

    const current = await this.events.findOrder(id);
    const fingerprint = JSON.stringify({ eventId, ...data });
    if (current && current.eventId !== eventId) return eventMissing();
    if (checkRepeat(current, data.requestId, fingerprint, access.user.id))
      return current!;
    if (current)
      throwBusinessError({
        code: "EVENT_REQUEST_CONFLICT",
        category: "conflict",
      });

    const event = await this.events.find(eventId);
    if (!event) return eventMissing();
    if (event.version !== data.catalogVersion) return eventChanged();
    const now = new Date().toISOString();
    const order: EventOrder = {
      ...orderFields(data, event, current ?? undefined),
      id,
      eventId,
      version: 1,
      createdAt: now,
      createdBy: access.user.id,
      createdByName: access.user.name,
      updatedAt: now,
      updatedBy: access.user.id,
      updatedByName: access.user.name,
      lastOperation: data.requestId,
      fingerprint,
    };
    const outcome = await this.events.createOrder(order, event.version);
    if (outcome === "stale") {
      const saved = await this.events.findOrder(id);
      if (checkRepeat(saved, data.requestId, fingerprint, access.user.id))
        return saved!;
    }
    checkEventWrite(outcome);
    return order;
  }
}
