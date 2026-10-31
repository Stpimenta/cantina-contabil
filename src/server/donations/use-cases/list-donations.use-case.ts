import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import { parseInput } from "@/shared/validation/input";
import { validateListDonations } from "../inputs/list-donations.input";
import type { Session } from "@/server/auth/models/session.model";
import { checkAccess } from "@/shared/auth/check-access";
import type { DonationRepository } from "../repositories/donation.repository";
export class ListDonationsUseCase {
  constructor(private readonly donations: DonationRepository) {}
  async execute(session: Session | null, input: unknown) {
    checkAccess(session);
    const filters = parseInput(validateListDonations(input));
    return await this.donations.list(filters, DEFAULT_PAGE_SIZE);
  }
}
