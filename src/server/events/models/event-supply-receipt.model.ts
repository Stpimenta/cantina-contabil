export interface EventSupplyReceipt {
  id: string;
  key: string;
  type: string;
  // Existing attachments predate size tracking.
  size: number | null;
}
