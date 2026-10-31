import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { EventRepository } from "../repositories/event.repository";
export class GetEventBoxesUseCase {
  constructor(private readonly events: EventRepository) {}
  execute(session: Session | null) {
    checkAccess(session);
    return this.events.cashBoxes();
  }
}
