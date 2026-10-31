import type { Session } from "@/server/auth/models/session.model";
import type { ReceiptRepository } from "@/server/events/repositories/receipt.repository";
import type { MovementRepository } from "../repositories/movement.repository";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateMovementReceiptReference } from "../inputs/movement.input";
export class GetMovementReceiptUseCase {
  constructor(
    private readonly movements: MovementRepository,
    private readonly receipts: ReceiptRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const { id, receiptId } = parseInput(
      validateMovementReceiptReference(input),
    );
    const movement = await this.movements.find(id);
    const attachment =
      movement && !movement.deletedAt
        ? movement.receipts.find((receipt) => receipt.id === receiptId)
        : null;
    if (!attachment)
      return throwBusinessError({
        code: "RECEIPT_NOT_FOUND",
        category: "not_found",
      });
    const receipt = await this.receipts.get(attachment.key);
    if (!receipt)
      return throwBusinessError({
        code: "RECEIPT_NOT_FOUND",
        category: "not_found",
      });
    return { body: receipt.body, type: attachment.type };
  }
}
