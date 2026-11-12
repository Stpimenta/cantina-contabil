export interface TemporaryAccess {
  id: string;
  eventId: string;
  name: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  expiresAt: number;
  revokedAt: number | null;
  activatedAt: number | null;
}
