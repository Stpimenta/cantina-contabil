"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePreviewModal } from "@/components/modals/image-preview-modal";
export function ReceiptLink({
  src,
  name,
  type,
  label,
  disabled = false,
}: {
  src: string;
  name: string;
  type: string | null;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (type === "application/pdf")
    return (
      <a
        className="text-link"
        href={src}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
      >
        {label ?? "Baixar comprovante"}
      </a>
    );
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label ?? "Ver comprovante"}
      </Button>
      {open && (
        <ImagePreviewModal
          src={src}
          alt={`Comprovante de ${name}`}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
