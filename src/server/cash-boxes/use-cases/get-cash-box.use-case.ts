import { validateCashBoxId } from "../inputs/cash-box-reference.input";
import { parseInput } from "@/shared/validation/input";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { CashBoxRepository } from "../repositories/cash-box.repository";
import { cashBoxMissing } from "../models/cash-box-rules";
export class GetCashBoxUseCase {
  constructor(private readonly boxes: CashBoxRepository) {}
  async execute(session: Session | null, rawId: unknown) {
    checkAccess(session);
    const id = parseInput(validateCashBoxId(rawId));
    const box = await this.boxes.find(id);
    return box ? box : cashBoxMissing();
  }
}
