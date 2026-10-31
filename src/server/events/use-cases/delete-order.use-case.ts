import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import {
  validateEventId,
  validateEventVersion,
} from "../inputs/event-query.input";
import {
  eventMissing,
  eventChanged,
  checkEventWrite,
} from "../models/event-rules";
export class DeleteOrderUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(
    session: Session | null,
    rawEventId: unknown,
    rawId: unknown,
    rawVersion: unknown,
  ) {
    const access = checkAccess(session);
    const eventId = parseInput(validateEventId(rawEventId));
    const id = parseInput(validateEventId(rawId));
    const expectedVersion = parseInput(validateEventVersion(rawVersion));
    const current = await this.events.findOrder(id);
    if (!current || current.eventId !== eventId) return eventMissing();
    if (current.version !== expectedVersion) return eventChanged();
    const event = await this.events.find(eventId);
    if (!event) return eventMissing();
    checkEventWrite(
      await this.events.softDeleteOrder({
        id,
        eventId,
        expectedVersion,
        catalogVersion: event.version,
        deletedAt: new Date().toISOString(),
        deletedBy: access.user.id,
        deletedByName: access.user.name,
      }),
    );
    return { id, eventId };
  }
}
