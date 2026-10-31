import { throwBusinessError } from "@/shared/errors/business-error";
import type { DonationWrite } from "../repositories/donation.repository";
export const DONOR_NAME_MAX = 100;
export const DONATION_NOTE_MAX = 500;

export function parseDonationAmount(value: string): number | null {
  const amount = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) return null;
  const [whole, fraction = ""] = amount.split(".");
  if (whole.length > 16) return null;
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return cents > 0n && cents <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(cents)
    : null;
}

export const donationChanged = () =>
  throwBusinessError({ code: "DONATION_CHANGED", category: "conflict" });
export function checkDonationBalance(balance: number, delta: bigint) {
  const result = BigInt(balance) + delta;
  if (result < 0n)
    throwBusinessError({
      code: "DONATION_INSUFFICIENT_BALANCE",
      category: "conflict",
    });
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throwBusinessError({
      code: "AMOUNT_LIMIT",
      category: "validation",
      issues: { amount: "AMOUNT_LIMIT" },
    });
}
export function checkDonationWrite(result: DonationWrite) {
  if (result === "saved") return;
  if (result === "changed") return donationChanged();
  if (result === "insufficient")
    return throwBusinessError({
      code: "DONATION_INSUFFICIENT_BALANCE",
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
