import { throwBusinessError } from "@/shared/errors/business-error";
import type { Session } from "@/server/auth/models/session.model";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import { checkAccess } from "@/shared/auth/check-access";
import type { Donation } from "../models/donation.model";
import type { DonationRepository } from "../repositories/donation.repository";
import {
  validateDonation,
  validateDonationRequest,
} from "../inputs/create-donation.input";
import { parseInput } from "@/shared/validation/input";
export class CreateDonationUseCase {
  constructor(
    private readonly donations: DonationRepository,
    private readonly boxes: CashBoxRepository,
  ) {}
  async execute(
    session: Session | null,
    rawRequestId: unknown,
    input: unknown,
  ) {
    const access = checkAccess(session);
    const requestId = parseInput(validateDonationRequest(rawRequestId));
    const data = parseInput(validateDonation(input));
    const now = new Date().toISOString();
    const donation: Donation = {
      version: 1,
      updatedAt: now,
      updatedBy: access.user.id,
      updatedByName: access.user.name,
      id: requestId,
      ...data,
      createdAt: now,
      createdBy: access.user.id,
      createdByName: access.user.name,
      deletedAt: null,
      deletedBy: null,
      deletedByName: null,
    };
    const same = (current: Donation) =>
      current.createdBy === donation.createdBy &&
      current.deletedAt === null &&
      current.cashBoxId === donation.cashBoxId &&
      current.amountCents === donation.amountCents &&
      current.donatedOn === donation.donatedOn &&
      current.donorName === donation.donorName &&
      current.note === donation.note;
    const conflict = () =>
      throwBusinessError({
        code: "DONATION_REQUEST_CONFLICT",
        category: "conflict",
      });
    const existing = await this.donations.find(requestId);
    if (existing) return same(existing) ? existing : conflict();
    if (!(await this.boxes.find(data.cashBoxId)))
      throwBusinessError({
        code: "CASH_BOX_UNAVAILABLE",
        category: "conflict",
        issues: { cashBoxId: "CASH_BOX_UNAVAILABLE" },
      });
    const result = await this.donations.create(donation);
    if (result === "balance_limit")
      throwBusinessError({
        code: "AMOUNT_LIMIT",
        category: "validation",
        issues: { amount: "AMOUNT_LIMIT" },
      });
    if (result === "box_unavailable")
      throwBusinessError({
        code: "CASH_BOX_UNAVAILABLE",
        category: "conflict",
      });
    if (result === "exists") {
      const saved = await this.donations.find(requestId);
      return saved && same(saved) ? saved : conflict();
    }
    return donation;
  }
}
