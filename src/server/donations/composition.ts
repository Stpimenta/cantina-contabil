import "server-only";
import { UpdateDonationUseCase } from "./use-cases/update-donation.use-case";
import { DeleteDonationUseCase } from "./use-cases/delete-donation.use-case";
import { createDatabase } from "@/shared/infrastructure/database";
import { D1CashBoxRepository } from "@/server/cash-boxes/infrastructure/d1-cash-box.repository";
import { D1DonationRepository } from "./infrastructure/d1-donation.repository";
import { CreateDonationUseCase } from "./use-cases/create-donation.use-case";
import { ListDonationsUseCase } from "./use-cases/list-donations.use-case";
import { GetDonationOptionsUseCase } from "./use-cases/get-donation-options.use-case";
export function createDonations() {
  const db = createDatabase();
  const donations = new D1DonationRepository(db);
  return {
    update: new UpdateDonationUseCase(donations, new D1CashBoxRepository(db)),
    delete: new DeleteDonationUseCase(donations, new D1CashBoxRepository(db)),
    create: new CreateDonationUseCase(donations, new D1CashBoxRepository(db)),
    list: new ListDonationsUseCase(donations),
    options: new GetDonationOptionsUseCase(donations),
  };
}
