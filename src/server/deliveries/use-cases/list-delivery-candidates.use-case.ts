import type { Session } from "@/server/auth/models/session.model";
import type { EventRepository } from "@/server/events/repositories/event.repository";
import type { DeliveryRepository } from "../repositories/delivery.repository";
import { parseInput } from "@/shared/validation/input";
import { validateDeliveryQuery } from "../inputs/delivery.input";
import { deliveryEvent } from "../models/delivery-rules";
export class ListDeliveryCandidatesUseCase {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null, eventInput: unknown, input: unknown) {
    const event = await deliveryEvent(this.events, session, eventInput, true),
      query = parseInput(validateDeliveryQuery(input));
    return this.repo.candidates(event.id, query.q, query.page);
  }
}
