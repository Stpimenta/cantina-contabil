"use client";
import { ReceiptLink } from "@/components/ui/receipt-link";
export function SupplyReceipt({
  eventId,
  supplyId,
  receiptId,
  ...props
}: {
  eventId: string;
  supplyId: string;
  receiptId?: string;
  name: string;
  type: string | null;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <ReceiptLink
      {...props}
      src={`/eventos/${eventId}/insumos/${supplyId}/comprovante${receiptId ? `?receiptId=${encodeURIComponent(receiptId)}` : ""}`}
    />
  );
}
