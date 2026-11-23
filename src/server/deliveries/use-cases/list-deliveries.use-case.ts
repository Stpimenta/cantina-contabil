import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import { canAlterEvent } from "@/shared/auth/access-policy";
import { validateDeliveryQuery } from "../inputs/delivery.input";
import { deliveryEvent } from "../models/delivery-rules";
export class ListDeliveriesUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null, eventInput: unknown, input: unknown) {
    const event = await deliveryEvent(this.events, session, eventInput),
      query = parseInput(validateDeliveryQuery(input));
    const writable = canAlterEvent(session!, event);
    const settings = await this.repo.settings(event.id);
    const page = await this.repo.routes(event.id, query.page);
    const routes = await Promise.all(
      page.items.map(async (r) => ({
        ...r,
        orders: await this.repo.orders(event.id, r.id),
      })),
    );
    return {
      routeOptions: writable ? await this.repo.routeOptions(event.id) : [],
      eventId: event.id,
      eventName: event.name,
      writable,
      settings,
      drivers: (await this.repo.drivers()).filter(
        (d) => writable || settings?.driverIds.includes(d.id),
      ),
      routes: { ...page, items: routes },
      accesses: writable ? await this.repo.accesses(event.id) : [],
    };
  }
}
