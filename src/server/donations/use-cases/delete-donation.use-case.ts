import type { Session } from "@/server/auth/models/session.model";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import { checkAccess } from "@/shared/auth/check-access";
import { parseInput } from "@/shared/validation/input";
import { validateDonationReference } from "../inputs/donation-reference.input";
import type { DonationRepository } from "../repositories/donation.repository";
import {
  donationChanged,
  checkDonationBalance,
  checkDonationWrite,
} from "../models/donation-rules";
export class DeleteDonationUseCase {
  constructor(
    private readonly donations: DonationRepository,
    private readonly boxes: CashBoxRepository,
  ) {}
  async execute(session: Session | null, reference: unknown, input?: unknown) {
    const { user } = checkAccess(session);
    const { id, version } = parseInput(validateDonationReference(reference));
    const current = await this.donations.find(id);
    if (!current || current.version !== version) return donationChanged();
    const box = await this.boxes.find(current.cashBoxId);
    if (!box) return donationChanged();
    checkDonationBalance(box.balanceCents, -BigInt(current.amountCents));
    const now = new Date().toISOString();
    const value = {
      ...current,
      version: version + 1,
      updatedAt: now,
      updatedBy: user.id,
      updatedByName: user.name,
      deletedAt: now,
      deletedBy: user.id,
      deletedByName: user.name,
    };
    checkDonationWrite(await this.donations.update(value, version));
    return { id };
  }
}
