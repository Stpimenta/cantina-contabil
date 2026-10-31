export interface OrderDeletion {
  id: string;
  eventId: string;
  expectedVersion: number;
  catalogVersion: number;
  deletedAt: string;
  deletedBy: number;
  deletedByName: string;
}
