import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import {
  validateEventId,
  validateEventQuery,
} from "../inputs/event-query.input";
import { eventMissing } from "../models/event-rules";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
export class ListEventHistoryUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(session: Session | null, idInput: unknown, input: unknown) {
    checkAccess(session);
    const id = parseInput(validateEventId(idInput));
    const data = parseInput(validateEventQuery(input));
    if (!(await this.events.find(id))) return eventMissing();
    return this.events.history(id, data.page, DEFAULT_PAGE_SIZE);
  }
}
