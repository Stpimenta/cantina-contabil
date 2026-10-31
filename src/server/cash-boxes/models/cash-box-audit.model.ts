export interface CashBoxAudit {
  id: number;
  cashBoxId: string;
  action: "create" | "update" | "delete";
  actorId: number;
  actorName: string;
  occurredAt: string;
  before: { name: string; description: string } | null;
  after: { name: string; description: string; deletedAt: string | null };
}
