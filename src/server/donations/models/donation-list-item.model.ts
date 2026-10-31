import type { Donation } from "./donation.model";
export interface DonationListItem extends Donation {
  cashBoxName: string;
}
