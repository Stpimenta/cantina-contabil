import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import type { EventRepository } from "../repositories/event.repository";
import type { EventSupplyRepository } from "../repositories/event-supply.repository";
import {
  validateEventId,
  validateEventVersion,
} from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";
export class ReceiveSupplyUseCase {
  constructor(
    private readonly supplies: EventSupplyRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(
    session: Session | null,
    rawEventId: unknown,
    rawId: unknown,
    rawVersion: unknown,
  ) {
    const access = checkAccess(session);
    const eventId = parseInput(validateEventId(rawEventId));
    const id = parseInput(validateEventId(rawId));
    const version = parseInput(validateEventVersion(rawVersion));
    if (!(await this.events.find(eventId))) return eventMissing();
    const current = await this.supplies.find(id);
    if (!current || current.deletedAt || current.eventId !== eventId)
      throwBusinessError({ code: "SUPPLY_NOT_FOUND", category: "not_found" });
    if (current.source !== "donation")
      throwBusinessError({ code: "SUPPLY_CHANGED", category: "conflict" });
    if (current.received) return { eventId, id };
    if (
      current.version !== version ||
      !(await this.supplies.receive(
        id,
        eventId,
        version,
        access.user.id,
        access.user.name,
        new Date().toISOString(),
      ))
    )
      throwBusinessError({ code: "SUPPLY_CHANGED", category: "conflict" });
    return { eventId, id };
  }
}
