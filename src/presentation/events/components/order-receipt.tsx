"use client";
import { ReceiptLink } from "@/components/ui/receipt-link";
export function OrderReceipt({
  eventId,
  orderId,
  receiptId,
  ...props
}: {
  eventId: string;
  orderId: string;
  receiptId: string;
  name: string;
  type: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <ReceiptLink
      {...props}
      src={`/events/${eventId}/orders/${orderId}/receipt?receiptId=${encodeURIComponent(receiptId)}`}
    />
  );
}
