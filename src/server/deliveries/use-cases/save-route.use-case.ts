import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import { validateRoute } from "../inputs/delivery.input";
import {
  deliveryEvent,
  deliveryChanged,
  operationMetadata,
} from "../models/delivery-rules";
export class SaveRouteUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null, eventInput: unknown, input: unknown) {
    const event = await deliveryEvent(this.events, session, eventInput, true),
      data = parseInput(validateRoute(input));
    const fingerprint = JSON.stringify({ ...data, actor: session!.user.id });
    const current = await this.repo.route(data.id);
    if (current && current.eventId !== event.id) return deliveryChanged();
    if (
      current?.lastOperation === data.requestId &&
      current.fingerprint === fingerprint
    )
      return current;
    if (current?.cancelled || (current?.version ?? 0) !== data.version)
      return deliveryChanged();
    const settings = await this.repo.settings(event.id);
    if (!settings?.driverIds.includes(data.driverId)) return deliveryChanged();
    for (const id of data.orderIds) {
      const order = await this.events.findOrder(id);
      if (
        !order ||
        order.eventId !== event.id ||
        order.fulfillmentMode !== "delivery" ||
        (order.fulfilled && !current?.orderIds.includes(id))
      )
        return deliveryChanged();
    }
    if (current) {
      const orders = await this.repo.orders(event.id, current.id);
      if (orders.some((o) => o.fulfilled && !data.orderIds.includes(o.id)))
        return deliveryChanged();
    }
    const value = {
      id: data.id,
      eventId: event.id,
      name: data.name,
      driverId: data.driverId,
      orderIds: data.orderIds,
      startedAt: current?.startedAt ?? null,
      cancelled: false,
      ...operationMetadata(session, data.requestId, fingerprint, data.version),
    };
    if (!(await this.repo.saveRoutes([{ value, expected: data.version }])))
      return deliveryChanged();
    return value;
  }
}
