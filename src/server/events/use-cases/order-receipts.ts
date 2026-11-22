import {
  BusinessError,
  throwBusinessError,
} from "@/shared/errors/business-error";
import { readReceiptContent } from "@/shared/receipts/receipt-content";
import { RECEIPT_MAX_FILES } from "@/shared/receipts/receipt-input";
import type { ReceiptRepository } from "../repositories/receipt.repository";
import type { OrderReceipt } from "../models/order-receipt.model";

export function orderReceiptKey(
  eventId: string,
  orderId: string,
  receiptId: string,
) {
  return `orders/${eventId}/${orderId}/${receiptId}`;
}
export function keepOrderReceipts(
  current: OrderReceipt[],
  ids: string[] | undefined,
  count: number,
) {
  const kept =
    ids === undefined
      ? current
      : current.filter((receipt) => ids.includes(receipt.id));
  if (
    (ids && kept.length !== ids.length) ||
    kept.length + count > RECEIPT_MAX_FILES
  )
    throwBusinessError({
      code: "INVALID_ORDER_INPUT",
      category: "validation",
      issues: { receipts: "INVALID_ORDER_RECEIPT" },
    });
  return kept;
}
export async function inspectOrderReceipts(files: File[]) {
  const hashes: string[] = [];
  for (const file of files) {
    try {
      const { hash } = await readReceiptContent(file);
      hashes.push(hash!);
    } catch (error) {
      if (
        error instanceof BusinessError &&
        error.details.code === "INVALID_SUPPLY_INPUT"
      )
        throwBusinessError({
          code: "INVALID_ORDER_INPUT",
          category: "validation",
          issues: { receipts: "INVALID_ORDER_RECEIPT" },
        });
      throw error;
    }
  }
  return hashes;
}
export async function storeOrderReceipts(
  repository: ReceiptRepository | undefined,
  eventId: string,
  orderId: string,
  operationId: string,
  files: File[],
  hashes: string[],
): Promise<OrderReceipt[]> {
  const result: OrderReceipt[] = [];
  if (files.length && !repository)
    throw new Error("Repositório de comprovantes não configurado");
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    // Immutable, reproducible ID for repeated/concurrent attempts of this operation.
    const bytes = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${operationId}:${index}:${hashes[index]}`),
      ),
    );
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes.slice(0, 16), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    await repository!.put(
      orderReceiptKey(eventId, orderId, id),
      await file.arrayBuffer(),
      file.type,
    );
    result.push({ id, type: file.type, size: file.size });
  }
  return result;
}
