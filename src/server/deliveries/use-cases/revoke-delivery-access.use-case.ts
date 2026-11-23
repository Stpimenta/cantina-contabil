import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import { validateDeliveryId } from "../inputs/delivery.input";
import { deliveryEvent } from "../models/delivery-rules";
export class RevokeDeliveryAccessUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null, eventInput: unknown, id: unknown) {
    const event = await deliveryEvent(this.events, session, eventInput, true);
    await this.repo.revoke(parseInput(validateDeliveryId(id)), event.id);
    return { revoked: true };
  }
}
