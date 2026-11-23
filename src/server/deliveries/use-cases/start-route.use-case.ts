import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import {
  validateDeliveryId,
  validateRouteChange,
} from "../inputs/delivery.input";
import {
  deliveryEvent,
  deliveryChanged,
  operationMetadata,
} from "../models/delivery-rules";
export class StartRouteUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(
    session: Session | null,
    eventInput: unknown,
    routeInput: unknown,
    input: unknown,
  ) {
    const event = await deliveryEvent(this.events, session, eventInput, true),
      id = parseInput(validateDeliveryId(routeInput)),
      data = parseInput(validateRouteChange(input));
    const current = await this.repo.route(id),
      fingerprint = JSON.stringify({
        ...data,
        operation: "start",
        actor: session!.user.id,
      });
    if (!current || current.eventId !== event.id) return deliveryChanged();
    if (
      current.lastOperation === data.requestId &&
      current.fingerprint === fingerprint
    )
      return current;
    if (current.cancelled || current.version !== data.version)
      return deliveryChanged();
    const orders = await this.repo.orders(event.id, id);
    if (current.startedAt || orders.every((o) => o.fulfilled)) return current;
    const value = {
      ...current,
      cancelled: false,
      startedAt: new Date().toISOString(),
      ...operationMetadata(session, data.requestId, fingerprint, data.version),
    };
    if (!(await this.repo.saveRoutes([{ value, expected: data.version }])))
      return deliveryChanged();
    return value;
  }
}
