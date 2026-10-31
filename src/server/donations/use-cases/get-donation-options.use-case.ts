import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { DonationRepository } from "../repositories/donation.repository";
export class GetDonationOptionsUseCase {
  constructor(private readonly donations: DonationRepository) {}
  async execute(session: Session | null) {
    const access = checkAccess(session);
    return await this.donations.options();
  }
}
