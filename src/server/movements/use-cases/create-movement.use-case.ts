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
import { validateMovementCreate } from "../inputs/movement.input";
import type { Movement } from "../models/movement.model";
import type { MovementRepository } from "../repositories/movement.repository";
import { checkMovementWrite, movementChanged } from "../models/movement-rules";
export class CreateMovementUseCase {
  constructor(
    private readonly movements: MovementRepository,
    private readonly boxes: CashBoxRepository,
    private readonly receipts: ReceiptRepository,
  ) {}
  async execute(session: Session | null, input: unknown, files: File[] = []) {
    const { user } = checkAccess(session);
    const {
      requestId,
      amount,
      receipts: metadata,
      retainedReceiptIds,
      ...data
    } = parseInput(
      validateMovementCreate(
        typeof input === "object" && input
          ? { ...input, receipts: files.map(receiptMetadata) }
          : input,
      ),
    );
    const hashes = await inspectMovementReceipts(files);
    const fingerprint = JSON.stringify({
      ...data,
      amount,
      hashes,
      actorId: user.id,
    });
    const existing = await this.movements.find(requestId);
    if (existing)
      return existing.fingerprint === fingerprint && !existing.deletedAt
        ? existing
        : movementChanged();
    const box = await this.boxes.find(data.cashBoxId);
    if (!box)
      return throwBusinessError({
        code: "CASH_BOX_UNAVAILABLE",
        category: "conflict",
      });
    checkMovementBalance(
      box.balanceCents,
      movementEffect(data.direction, amount),
    );
    const receipts = await storeMovementReceipts(
      this.receipts,
      requestId,
      files,
      hashes,
    );
    const now = new Date().toISOString();
    const value: Movement = {
      ...data,
      receipts,
      id: requestId,
      amountCents: amount,
      cashBoxName: box.name,
      fingerprint,
      version: 1,
      createdAt: now,
      createdBy: user.id,
      createdByName: user.name,
      updatedAt: now,
      updatedBy: user.id,
      updatedByName: user.name,
      deletedAt: null,
      deletedBy: null,
      deletedByName: null,
    };
    const result = await this.movements.create(value);
    if (result === "changed") {
      const saved = await this.movements.find(requestId);
      if (saved?.fingerprint === fingerprint && !saved.deletedAt) return saved;
    }
    checkMovementWrite(result);
    return value;
  }
}
