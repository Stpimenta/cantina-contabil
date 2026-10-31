import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
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
export class DeleteEventUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(session: Session | null, rawId: unknown, rawVersion: unknown) {
    const access = checkAccess(session);
    const id = parseInput(validateEventId(rawId));
    const expectedVersion = parseInput(validateEventVersion(rawVersion));
    const current = await this.events.find(id);
    if (!current) return eventMissing();
    if (current.version !== expectedVersion) return eventChanged();
    const orders = await this.events.listOrders(id, "", 1, 1);
    if (orders.total)
      throwBusinessError({ code: "EVENT_HAS_ORDERS", category: "conflict" });
    checkEventWrite(
      await this.events.softDelete({
        id,
        expectedVersion,
        deletedAt: new Date().toISOString(),
        deletedBy: access.user.id,
        deletedByName: access.user.name,
      }),
    );
    return { id };
  }
}
