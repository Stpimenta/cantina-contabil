import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import { validateMove } from "../inputs/delivery.input";
import {
  deliveryEvent,
  deliveryChanged,
  operationMetadata,
} from "../models/delivery-rules";
export class MoveDeliveryUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null, eventInput: unknown, input: unknown) {
    const event = await deliveryEvent(this.events, session, eventInput, true),
      data = parseInput(validateMove(input));
    const from = await this.repo.route(data.fromId),
      to = await this.repo.route(data.toId),
      fingerprint = JSON.stringify({ ...data, actor: session!.user.id });
    if (!from || !to || from.eventId !== event.id || to.eventId !== event.id)
      return deliveryChanged();
    if (
      [from, to].every(
        (r) =>
          r.lastOperation === data.requestId && r.fingerprint === fingerprint,
      )
    )
      return { id: to.id };
    if (
      from.cancelled ||
      to.cancelled ||
      from.version !== data.fromVersion ||
      to.version !== data.toVersion ||
      !from.orderIds.includes(data.orderId)
    )
      return deliveryChanged();
    const order = await this.events.findOrder(data.orderId);
    if (
      !order ||
      order.eventId !== event.id ||
      order.fulfillmentMode !== "delivery" ||
      order.fulfilled
    )
      return deliveryChanged();
    const ids = from.orderIds.filter((id) => id !== order.id);
    const source = {
      ...from,
      orderIds: ids,
      cancelled: !ids.length,
      ...operationMetadata(session, data.requestId, fingerprint, from.version),
    };
    const destination = {
      ...to,
      orderIds: [...to.orderIds, order.id],
      ...operationMetadata(session, data.requestId, fingerprint, to.version),
    };
    if (
      !(await this.repo.saveRoutes([
        { value: source, expected: from.version },
        { value: destination, expected: to.version },
      ]))
    )
      return deliveryChanged();
    return { id: to.id };
  }
}
