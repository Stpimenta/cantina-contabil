export interface Donation {
  id: string;
  cashBoxId: string;
  amountCents: number;
  donatedOn: string;
  donorName: string;
  note: string;
  version: number;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
  createdAt: string;
  createdBy: number;
  createdByName: string;
  deletedAt: string | null;
  deletedBy: number | null;
  deletedByName: string | null;
}
