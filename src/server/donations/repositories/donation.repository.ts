import type { Donation } from "../models/donation.model";
import type { DonationListItem } from "../models/donation-list-item.model";
export interface DonationFilters {
  query: string;
  cashBoxId: string;
  year: number | null;
  page: number;
}
export interface DonationList {
  items: DonationListItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: DonationFilters;
}
export type DonationWrite =
  "saved" | "changed" | "box_unavailable" | "balance_limit" | "insufficient";
export interface DonationRepository {
  update(value: Donation, expectedVersion: number): Promise<DonationWrite>;
  create(
    donation: Donation,
  ): Promise<"saved" | "box_unavailable" | "exists" | "balance_limit">;
  find(id: string): Promise<Donation | null>;
  list(filters: DonationFilters, pageSize: number): Promise<DonationList>;
  options(): Promise<{
    cashBoxes: { id: string; name: string }[];
    years: number[];
  }>;
}
