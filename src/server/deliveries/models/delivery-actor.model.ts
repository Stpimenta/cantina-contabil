export interface DeliveryActor {
  kind: "delivery";
  id: string;
  name: string;
  eventId: string;
  driverId: string;
  createdBy: number;
  createdByName: string;
  expiresAt: number;
}
