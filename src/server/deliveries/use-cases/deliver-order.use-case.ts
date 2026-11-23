import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import type { DeliveryAuthorization } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import { validateDeliveryId, validateDeliver } from "../inputs/delivery.input";
import { deliveryEvent, deliveryChanged } from "../models/delivery-rules";
import { checkEventWrite } from "@/server/events/models/event-rules";
export type DeliveryIdentity =
  | { kind: "user"; session: Session | null }
  | { kind: "temporary"; credential: unknown };
export class DeliverOrderUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
    private readonly auth: DeliveryAuthorization,
  ) {}
  async execute(
    identity: DeliveryIdentity,
    eventInput: unknown,
    orderInput: unknown,
    input: unknown,
  ) {
    const eventId = parseInput(validateDeliveryId(eventInput)),
      orderId = parseInput(validateDeliveryId(orderInput)),
      data = parseInput(validateDeliver(input));
    const access =
      identity.kind === "temporary"
        ? await this.auth.execute(identity.credential, eventId)
        : null;
    const event =
      identity.kind === "user"
        ? await deliveryEvent(this.events, identity.session, eventId, true)
        : await this.events.find(eventId);
    const route = await this.repo.route(data.routeId);
    if (
      !event ||
      !route ||
      route.cancelled ||
      route.eventId !== eventId ||
      !route.orderIds.includes(orderId) ||
      (access && route.driverId !== access.driverId)
    )
      return deliveryChanged();
    const current = await this.events.findOrder(orderId);
    if (
      !current ||
      current.eventId !== eventId ||
      current.fulfillmentMode !== "delivery"
    )
      return deliveryChanged();
    const actorKey = access
      ? access.id
      : identity.kind === "user"
        ? identity.session!.user.id
        : null;
    const fingerprint = JSON.stringify({
      operation: "deliver",
      eventId,
      orderId,
      ...data,
      actor: actorKey,
      kind: identity.kind,
    });
    if (
      current.lastOperation === data.requestId &&
      current.fingerprint === fingerprint
    )
      return { id: orderId };
    if (current.version !== data.version) return deliveryChanged();
    if (current.fulfilled === data.fulfilled) return { id: orderId };
    const user = identity.kind === "user" ? identity.session!.user : null;
    const order = {
      ...current,
      fulfilled: data.fulfilled,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.id ?? 0,
      updatedByName:
        user?.name ??
        `${access!.name} — acesso criado por ${access!.createdByName}`,
      updatedActor: access ?? undefined,
      lastOperation: data.requestId,
      fingerprint,
    };
    const outcome = await this.events.updateOrder(
      order,
      current.version,
      event.version,
    );
    if (outcome === "stale") {
      const saved = await this.events.findOrder(orderId);
      if (
        saved?.lastOperation === data.requestId &&
        saved.fingerprint === fingerprint
      )
        return { id: orderId };
    }
    checkEventWrite(outcome);
    return { id: orderId };
  }
}
