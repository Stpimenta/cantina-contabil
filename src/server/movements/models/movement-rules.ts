import { throwBusinessError } from "@/shared/errors/business-error";
import type { MovementWrite } from "../repositories/movement.repository";
export const movementChanged = () =>
  throwBusinessError({ code: "MOVEMENT_CHANGED", category: "conflict" });
export function checkMovementWrite(result: MovementWrite) {
  if (result === "saved") return;
  if (result === "changed") return movementChanged();
  if (result === "insufficient")
    return throwBusinessError({
      code: "MOVEMENT_INSUFFICIENT_BALANCE",
      category: "conflict",
    });
  if (result === "box_unavailable")
    return throwBusinessError({
      code: "CASH_BOX_UNAVAILABLE",
      category: "conflict",
    });
  return throwBusinessError({
    code: "AMOUNT_LIMIT",
    category: "validation",
    issues: { amount: "AMOUNT_LIMIT" },
  });
}

export function checkMovementBalance(balanceCents: number, deltaCents: bigint) {
  const result = BigInt(balanceCents) + deltaCents;
  if (result < 0n)
    throwBusinessError({
      code: "MOVEMENT_INSUFFICIENT_BALANCE",
      category: "conflict",
    });
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throwBusinessError({
      code: "AMOUNT_LIMIT",
      category: "validation",
      issues: { amount: "AMOUNT_LIMIT" },
    });
}
export const movementEffect = (
  direction: "incoming" | "outgoing",
  amountCents: number,
) => BigInt(amountCents) * (direction === "incoming" ? 1n : -1n);
