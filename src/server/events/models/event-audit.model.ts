export interface EventAudit {
  id: string;
  eventId: string;
  resourceId: string;
  resourceType: "event" | "order" | "supply" | "stock";
  action: "create" | "update";
  actorId: number;
  actorName: string;
  occurredAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
}
