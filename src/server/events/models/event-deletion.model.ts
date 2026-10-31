export interface EventDeletion {
  id: string;
  expectedVersion: number;
  deletedAt: string;
  deletedBy: number;
  deletedByName: string;
}
