"use client";
import { useRef, useEffect } from "react";
import { Modal } from "./modal";
import { Button } from "../ui/button";

export function ConfirmationModal({
  title,
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
  }, []);
  return (
    <Modal
      open
      title={title}
      onClose={() => {
        if (!busy) onCancel();
      }}
      footer={
        <>
          <Button
            ref={cancel}
            variant="neutral"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button variant="danger" busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
