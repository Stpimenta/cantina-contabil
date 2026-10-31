import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import type { EventRepository } from "../repositories/event.repository";
import type { EventSupplyRepository } from "../repositories/event-supply.repository";
import {
  validateEventId,
  validateEventQuery,
} from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";
export class ListSuppliesUseCase {
  constructor(
    private readonly supplies: EventSupplyRepository,
    private readonly events: EventRepository,
  ) {}
  async execute(session: Session | null, rawEventId: unknown, input: unknown) {
    checkAccess(session);
    const eventId = parseInput(validateEventId(rawEventId));
    const data = parseInput(validateEventQuery(input));
    if (!(await this.events.find(eventId))) return eventMissing();
    return this.supplies.list(eventId, data.page, DEFAULT_PAGE_SIZE);
  }
}
