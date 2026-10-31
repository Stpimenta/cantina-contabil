import type { ReceiptRepository } from "@/server/events/repositories/receipt.repository";
import { readReceiptContent } from "@/shared/receipts/receipt-content";
import type { MovementReceipt } from "../models/movement-receipt.model";
export async function inspectMovementReceipts(files: File[]) {
  const hashes: string[] = [];
  for (const file of files) {
    const { hash } = await readReceiptContent(file, true);
    hashes.push(hash!);
  }
  return hashes;
}
export async function storeMovementReceipts(
  repository: ReceiptRepository,
  id: string,
  files: File[],
  hashes: string[],
): Promise<MovementReceipt[]> {
  const result: MovementReceipt[] = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const key = `movements/${id}/${hashes[index]}`;
    await repository.put(key, await file.arrayBuffer(), file.type);
    result.push({
      id: crypto.randomUUID(),
      key,
      type: file.type,
      size: file.size,
    });
  }
  return result;
}
