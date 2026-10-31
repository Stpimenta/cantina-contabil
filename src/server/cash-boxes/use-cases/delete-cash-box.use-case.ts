import { parseInput } from "@/shared/validation/input";
import { validateCashBoxReference } from "../inputs/cash-box-reference.input";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { CashBoxRepository } from "../repositories/cash-box.repository";
import {
  cashBoxMissing,
  cashBoxConflict,
  mapWriteOutcome,
} from "../models/cash-box-rules";
export class DeleteCashBoxUseCase {
  constructor(private readonly boxes: CashBoxRepository) {}
  async execute(session: Session | null, rawId: unknown, rawVersion: unknown) {
    const access = checkAccess(session);
    const { id, version } = parseInput(
      validateCashBoxReference({ id: rawId, version: rawVersion }),
    );
    const current = await this.boxes.find(id);
    if (!current) return cashBoxMissing();
    if (current.version !== version) return cashBoxConflict();
    // O trigger D1 bloqueia atomicamente a exclusão de caixas com doações,
    // inclusive se uma entrada for registrada depois desta leitura.
    const now = new Date().toISOString();
    const actor = access.user;
    const box = {
      ...current,
      deletedAt: now,
      deletedBy: actor.id,
      deletedByName: actor.name,
      updatedAt: now,
      updatedBy: actor.id,
      updatedByName: actor.name,
      version: version + 1,
    };
    return mapWriteOutcome(
      await this.boxes.softDelete(box, version),
      undefined,
    );
  }
}
