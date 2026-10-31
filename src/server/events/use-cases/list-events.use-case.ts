import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import { validateEventQuery } from "../inputs/event-query.input";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
export class ListEventsUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const data = parseInput(validateEventQuery(input));
    return this.events.list(data.query, data.page, DEFAULT_PAGE_SIZE);
  }
}
