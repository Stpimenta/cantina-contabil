export interface ReceiptRepository {
  put(key: string, body: ArrayBuffer, type: string): Promise<void>;
  get(key: string): Promise<{ body: ArrayBuffer; type: string } | null>;
}
