"use client";
import { FileUploadField } from "@/components/ui/file-upload-field";
import {
  RECEIPT_MAX_BYTES,
  RECEIPT_MAX_FILES,
} from "@/shared/receipts/receipt-input";
import type { OrderReceipt as Receipt } from "@/server/events/models/order-receipt.model";
import { OrderReceipt } from "./order-receipt";

export function OrderReceiptUpload({
  id,
  eventId,
  orderId,
  customerName,
  files,
  receipts,
  onFilesChange,
  onRemoveReceipt,
  disabled,
  error,
}: {
  id: string;
  eventId: string;
  orderId?: string;
  customerName: string;
  files: File[];
  receipts: Receipt[];
  onFilesChange: (files: File[]) => void;
  onRemoveReceipt: (receiptId: string) => void;
  disabled: boolean;
  error?: string;
}) {
  return (
    <FileUploadField
      id={id}
      label="Comprovantes (opcional)"
      files={files}
      onValueChange={onFilesChange}
      maxFiles={RECEIPT_MAX_FILES}
      maxBytes={RECEIPT_MAX_BYTES}
      disabled={disabled}
      error={error}
      hint="Até 5 arquivos JPEG, PNG, WebP ou PDF, até 5 MB cada."
      existingFiles={receipts.map((receipt, index) => ({
        id: receipt.id,
        name: `Comprovante ${index + 1}`,
        size: receipt.size,
        label: orderId ? (
          <OrderReceipt
            eventId={eventId}
            orderId={orderId}
            receiptId={receipt.id}
            name={customerName}
            type={receipt.type}
            label={`Comprovante ${index + 1}`}
            disabled={disabled}
          />
        ) : (
          `Comprovante ${index + 1}`
        ),
      }))}
      onRemoveExisting={onRemoveReceipt}
    />
  );
}
