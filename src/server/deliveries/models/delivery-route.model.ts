export interface DeliveryRoute {
  id: string;
  eventId: string;
  name: string;
  driverId: string;
  orderIds: string[];
  startedAt: string | null;
  cancelled: boolean;
  version: number;
  updatedAt: string;
  updatedBy: number;
  updatedByName: string;
  lastOperation: string;
  fingerprint: string;
}
