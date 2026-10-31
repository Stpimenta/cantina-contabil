import type { EventSupplyReceipt } from "../models/event-supply-receipt.model";
import type { ReceiptRepository } from "../repositories/receipt.repository";
import { readReceiptContent } from "../inputs/receipt-content";
// Validate/hash one buffer at a time; do not retain all 25 MB as ArrayBuffers.
export async function inspectSupplyReceipts(files: File[]) {
  const hashes: string[] = [];
  for (const file of files) {
    const { hash } = await readReceiptContent(file);
    hashes.push(hash!);
  }
  return hashes;
}
export async function storeSupplyReceipts(
  repository: ReceiptRepository,
  eventId: string,
  supplyId: string,
  files: File[],
  hashes: string[],
): Promise<EventSupplyReceipt[]> {
  const result: EventSupplyReceipt[] = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const hash = hashes[index];
    const key = `supplies/${eventId}/${supplyId}/${hash}`;
    await repository.put(key, await file.arrayBuffer(), file.type);
    const id = crypto.randomUUID();
    result.push({ id, key, type: file.type, size: file.size });
  }
  return result;
}
