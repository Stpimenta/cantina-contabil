export interface StockEntry {
  stockContext?: string | null;
  productName?: string;
  categoryName?: string;
  deletedAt: string | null;
  deletedBy: number | null;
  deletedByName: string | null;
  id: string;
  eventId: string;
  productId: string;
  quantity: number;
  version: number;
  createdAt: string;
  createdBy: number;
  createdByName: string;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
  lastOperation: string;
  fingerprint: string;
}
