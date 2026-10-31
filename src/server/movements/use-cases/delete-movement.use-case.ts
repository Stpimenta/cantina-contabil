import { checkMovementBalance, movementEffect } from "../models/movement-rules";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { validateMovementReference } from "../inputs/movement.input";
import type { MovementRepository } from "../repositories/movement.repository";
import { checkMovementWrite, movementChanged } from "../models/movement-rules";
export class DeleteMovementUseCase {
  constructor(
    private readonly movements: MovementRepository,
    private readonly boxes: CashBoxRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    const { user } = checkAccess(session);
    const { id, version } = parseInput(validateMovementReference(input));
    const current = await this.movements.find(id);
    if (!current || current.deletedAt || current.version !== version)
      return movementChanged();
    const box = await this.boxes.find(current.cashBoxId);
    if (!box) return movementChanged();
    checkMovementBalance(
      box.balanceCents,
      -movementEffect(current.direction, current.amountCents),
    );
    const now = new Date().toISOString();
    const value = {
      ...current,
      version: version + 1,
      deletedAt: now,
      deletedBy: user.id,
      deletedByName: user.name,
      updatedAt: now,
      updatedBy: user.id,
      updatedByName: user.name,
    };
    checkMovementWrite(await this.movements.update(value, version));
    return { id };
  }
}
