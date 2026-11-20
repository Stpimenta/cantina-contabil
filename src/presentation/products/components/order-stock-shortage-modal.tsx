"use client";
import type { ApplicationError } from "@/shared/errors/application-error";
import { ErrorModal } from "@/components/modals/error-modal";
export function OrderStockShortageModal({
  error,
  onClose,
  onConfirm,
  busy,
}: {
  error: ApplicationError;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <ErrorModal
      error={error}
      onClose={onClose}
      busy={busy}
      onConfirmStock={onConfirm}
    />
  );
}
