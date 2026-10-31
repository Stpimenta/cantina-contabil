import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import type { EventRepository } from "../repositories/event.repository";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateSaveEvent } from "../inputs/save-event.input";
import {
  validateEventId,
  validateEventVersion,
} from "../inputs/event-query.input";
import {
  eventFields,
  checkRepeat,
  checkEventWrite,
  eventChanged,
  eventMissing,
} from "../models/event-rules";
import type { Event } from "../models/event.model";
export class UpdateEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly boxes: CashBoxRepository,
  ) {}
  async execute(
    session: Session | null,
    idInput: unknown,
    versionInput: unknown,
    input: unknown,
  ) {
    const access = checkAccess(session);
    const data = parseInput(validateSaveEvent(input));
    const id = parseInput(validateEventId(idInput));
    const expected = parseInput(validateEventVersion(versionInput));

    const current = await this.events.find(id);
    const fingerprint = JSON.stringify(data);
    if (checkRepeat(current, data.requestId, fingerprint, access.user.id))
      return current!;
    if (!current) return eventMissing();
    if (current.version !== expected) return eventChanged();
    if (current.cashBoxId !== data.cashBoxId)
      throwBusinessError({ code: "EVENT_BOX_LOCKED", category: "conflict" });

    if (!(await this.boxes.find(data.cashBoxId)))
      throwBusinessError({
        code: "CASH_BOX_UNAVAILABLE",
        category: "conflict",
      });
    const now = new Date().toISOString();
    const event: Event = {
      ...eventFields(data),
      id,
      version: expected + 1,
      createdAt: current?.createdAt ?? now,
      createdBy: current?.createdBy ?? access.user.id,
      createdByName: current?.createdByName ?? access.user.name,
      updatedAt: now,
      updatedBy: access.user.id,
      updatedByName: access.user.name,
      lastOperation: data.requestId,
      fingerprint,
      realCents: current?.realCents ?? 0,
      cashCents: current.cashCents,
      pixCents: current.pixCents,
      pendingCents: current?.pendingCents ?? 0,
      soldUnits: current.soldUnits,
      supplyCostCents: current.supplyCostCents,
    };
    const outcome = await this.events.update(event, expected);
    if (outcome === "stale") {
      const saved = await this.events.find(id);
      if (checkRepeat(saved, data.requestId, fingerprint, access.user.id))
        return saved!;
    }
    checkEventWrite(outcome);
    return event;
  }
}
