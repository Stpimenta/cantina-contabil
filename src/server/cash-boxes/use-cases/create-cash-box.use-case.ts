import { parseInput } from "@/shared/validation/input";
import { validateSaveCashBox } from "../inputs/save-cash-box.input";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { CashBoxRepository } from "../repositories/cash-box.repository";
import type { CashBox } from "../models/cash-box.model";
import { mapWriteOutcome } from "../models/cash-box-rules";
export class CreateCashBoxUseCase {
  constructor(private readonly boxes: CashBoxRepository) {}
  async execute(session: Session | null, input: unknown) {
    const access = checkAccess(session);
    const data = parseInput(validateSaveCashBox(input));
    const now = new Date().toISOString();
    const actor = access.user;
    const box: CashBox = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: now,
      createdBy: actor.id,
      createdByName: actor.name,
      updatedAt: now,
      updatedBy: actor.id,
      updatedByName: actor.name,
      deletedAt: null,
      deletedBy: null,
      deletedByName: null,
      version: 1,
    };
    return mapWriteOutcome(await this.boxes.create(box), box);
  }
}
