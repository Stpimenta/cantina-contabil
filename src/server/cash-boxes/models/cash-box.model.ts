export interface CashBox {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: number;
  createdByName: string;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
  deletedAt: string | null;
  deletedBy: number | null;
  deletedByName: string | null;
  version: number;
}
