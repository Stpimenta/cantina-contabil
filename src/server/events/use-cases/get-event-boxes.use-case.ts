import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { EventRepository } from "../repositories/event.repository";
export class GetEventBoxesUseCase {
  constructor(private readonly events: EventRepository) {}
  async execute(session: Session | null) {
    const access = checkAccess(session);
    const boxes = await this.events.cashBoxes();
    return boxes.filter((box) =>
      access.role === "operator"
        ? access.eventCashBoxIds?.includes(box.id)
        : access.role === "finance"
          ? access.cashBoxIds?.includes(box.id)
          : true,
    );
  }
}
