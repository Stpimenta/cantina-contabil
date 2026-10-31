import type { ReceiptRepository } from "@/server/events/repositories/receipt.repository";
import { receiptMetadata } from "@/shared/receipts/receipt-input";
import {
  inspectMovementReceipts,
  storeMovementReceipts,
} from "./movement-receipts";
import { checkMovementBalance, movementEffect } from "../models/movement-rules";
import type { Session } from "@/server/auth/models/session.model";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateMovementUpdate } from "../inputs/movement.input";
import type { MovementRepository } from "../repositories/movement.repository";
import { checkMovementWrite, movementChanged } from "../models/movement-rules";
export class UpdateMovementUseCase {
  constructor(
    private readonly movements: MovementRepository,
    private readonly boxes: CashBoxRepository,
    private readonly receipts: ReceiptRepository,
  ) {}
  async execute(session: Session | null, input: unknown, files: File[] = []) {
    const { user } = checkAccess(session);
    const fields = parseInput(
      validateMovementUpdate(
        typeof input === "object" && input
          ? { ...input, receipts: files.map(receiptMetadata) }
          : input,
      ),
    );
    const current = await this.movements.find(fields.id);
    if (!current || current.deletedAt || current.version !== fields.version)
      return movementChanged();
    const retained = fields.retainedReceiptIds.map((id) =>
      current.receipts.find((receipt) => receipt.id === id),
    );
    if (retained.some((receipt) => !receipt)) return movementChanged();
    const kept = retained.filter((receipt) => receipt !== undefined);
    const {
      id,
      version,
      amount,
      receipts: metadata,
      retainedReceiptIds,
      ...data
    } = parseInput(
      validateMovementUpdate({
        ...fields,
        amount:
          typeof input === "object" && input && "amount" in input
            ? input.amount
            : undefined,
        receipts: [
          ...kept.map(({ size, type }) => ({ size, type })),
          ...files.map(receiptMetadata),
        ],
      }),
    );
    const box = await this.boxes.find(data.cashBoxId);
    if (!box)
      return throwBusinessError({
        code: "CASH_BOX_UNAVAILABLE",
        category: "conflict",
      });
    const previousEffect = movementEffect(
      current.direction,
      current.amountCents,
    );
    const nextEffect = movementEffect(data.direction, amount);
    if (current.cashBoxId === data.cashBoxId)
      checkMovementBalance(box.balanceCents, nextEffect - previousEffect);
    else {
      const oldBox = await this.boxes.find(current.cashBoxId);
      if (!oldBox) return movementChanged();
      checkMovementBalance(oldBox.balanceCents, -previousEffect);
      checkMovementBalance(box.balanceCents, nextEffect);
    }
    const hashes = await inspectMovementReceipts(files);
    const added = await storeMovementReceipts(this.receipts, id, files, hashes);
    const value = {
      ...current,
      receipts: [...kept, ...added],
      ...data,
      amountCents: amount,
      cashBoxName: box.name,
      version: version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      updatedByName: user.name,
    };
    checkMovementWrite(await this.movements.update(value, version));
    return value;
  }
}
