import type { Session } from "@/server/auth/models/session.model";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { throwBusinessError } from "@/shared/errors/business-error";
import { validateDonation } from "../inputs/create-donation.input";
import { validateDonationReference } from "../inputs/donation-reference.input";
import type { DonationRepository } from "../repositories/donation.repository";
import {
  donationChanged,
  checkDonationBalance,
  checkDonationWrite,
} from "../models/donation-rules";
export class UpdateDonationUseCase {
  constructor(
    private readonly donations: DonationRepository,
    private readonly boxes: CashBoxRepository,
  ) {}
  async execute(session: Session | null, reference: unknown, input?: unknown) {
    const { user } = checkAccess(session);
    const { id, version } = parseInput(validateDonationReference(reference));
    const data = parseInput(validateDonation(input));
    const current = await this.donations.find(id);
    if (!current || current.version !== version) return donationChanged();
    const box = await this.boxes.find(data.cashBoxId);
    if (!box)
      return throwBusinessError({
        code: "CASH_BOX_UNAVAILABLE",
        category: "conflict",
      });
    if (current.cashBoxId === data.cashBoxId)
      checkDonationBalance(
        box.balanceCents,
        BigInt(data.amountCents) - BigInt(current.amountCents),
      );
    else {
      const oldBox = await this.boxes.find(current.cashBoxId);
      if (!oldBox) return donationChanged();
      checkDonationBalance(oldBox.balanceCents, -BigInt(current.amountCents));
      checkDonationBalance(box.balanceCents, BigInt(data.amountCents));
    }
    const value = {
      ...current,
      ...data,
      version: version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      updatedByName: user.name,
    };
    checkDonationWrite(await this.donations.update(value, version));
    return { id };
  }
}
