import { validateCashBoxReference } from "../inputs/cash-box-reference.input";
import { parseInput } from "@/shared/validation/input";
import { validateSaveCashBox } from "../inputs/save-cash-box.input";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { CashBoxRepository } from "../repositories/cash-box.repository";
import {
  cashBoxMissing,
  cashBoxConflict,
  mapWriteOutcome,
} from "../models/cash-box-rules";
export class UpdateCashBoxUseCase {
  constructor(private readonly boxes: CashBoxRepository) {}
  async execute(
    session: Session | null,
    rawId: unknown,
    rawVersion: unknown,
    input: unknown,
  ) {
    const access = checkAccess(session);
    const { id, version } = parseInput(
      validateCashBoxReference({ id: rawId, version: rawVersion }),
    );
    const data = parseInput(validateSaveCashBox(input));
    const current = await this.boxes.find(id);
    if (!current) return cashBoxMissing();
    if (current.version !== version) return cashBoxConflict();
    const box = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: access.user.id,
      updatedByName: access.user.name,
      version: version + 1,
    };
    return mapWriteOutcome(await this.boxes.update(box, version), box);
  }
}
