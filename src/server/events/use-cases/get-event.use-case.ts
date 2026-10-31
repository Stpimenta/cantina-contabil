import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import { validateEventId } from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";
export class GetEventUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const id = parseInput(validateEventId(input));
    const event = await this.events.find(id);
    return event ?? eventMissing();
  }
}
