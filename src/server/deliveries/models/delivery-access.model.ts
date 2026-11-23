export interface DeliveryAccess {
  id: string;
  eventId: string;
  driverId: string;
  name: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  expiresAt: number;
  revokedAt: number | null;
  activatedAt: number | null;
}
