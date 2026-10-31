import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateSaveEvent } from "../inputs/save-event.input";
import { validateEventId } from "../inputs/event-query.input";
import {
  eventFields,
  checkRepeat,
  checkEventWrite,
  eventMissing,
} from "../models/event-rules";
import type { Event } from "../models/event.model";
export class CreateEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly boxes: CashBoxRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    const access = checkAccess(session);
    const data = parseInput(validateSaveEvent(input));
    const id = data.requestId;

    const current = await this.events.find(id);
    const fingerprint = JSON.stringify(data);
    if (checkRepeat(current, data.requestId, fingerprint, access.user.id))
      return current!;
    if (current)
      throwBusinessError({
        code: "EVENT_REQUEST_CONFLICT",
        category: "conflict",
      });

    if (!(await this.boxes.find(data.cashBoxId)))
      throwBusinessError({
        code: "CASH_BOX_UNAVAILABLE",
        category: "conflict",
      });
    const now = new Date().toISOString();
    const event: Event = {
      ...eventFields(data),
      id,
      version: 1,
      createdAt: now,
      createdBy: access.user.id,
      createdByName: access.user.name,
      updatedAt: now,
      updatedBy: access.user.id,
      updatedByName: access.user.name,
      lastOperation: data.requestId,
      fingerprint,
      realCents: 0,
      cashCents: 0,
      pixCents: 0,
      pendingCents: 0,
      soldUnits: 0,
      supplyCostCents: 0,
    };
    const outcome = await this.events.create(event);
    if (outcome === "stale") {
      const saved = await this.events.find(id);
      if (checkRepeat(saved, data.requestId, fingerprint, access.user.id))
        return saved!;
    }
    checkEventWrite(outcome);
    return event;
  }
}
