import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import {
  validateDeliveryId,
  validateDeliveryQuery,
} from "../inputs/delivery.input";
import type { DeliveryAuthorization } from "../repositories/delivery.repository";
export class ListDriverDeliveriesUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
    private readonly auth: DeliveryAuthorization,
  ) {}
  async execute(credential: unknown, eventInput: unknown, input: unknown) {
    const eventId = parseInput(validateDeliveryId(eventInput)),
      query = parseInput(validateDeliveryQuery(input));
    const actor = await this.auth.execute(credential, eventId),
      event = (await this.events.find(eventId))!;
    const page = await this.repo.routes(eventId, query.page, actor.driverId);
    const items = await Promise.all(
      page.items.map(async (r) => {
        const { id, name, driverId, startedAt, version } = r;
        return {
          id,
          name,
          driverId,
          startedAt,
          version,
          orders: await this.repo.orders(eventId, id),
        };
      }),
    );
    return {
      eventId,
      eventName: event.name,
      driverName: actor.name,
      origin: (await this.repo.settings(eventId))?.origin ?? null,
      routes: { ...page, items },
    };
  }
}
