"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Modal } from "./modal";

export function CashBoxHistoryModal({
  boxId,
  initialOpen,
  children,
}: {
  boxId: string;
  initialOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);
  const router = useRouter();
  return (
    <>
      <Button
        variant="neutral"
        size="large"
        className="wide-action"
        onClick={() => setOpen(true)}
      >
        Histórico
      </Button>
      {open && (
        <Modal
          open
          title="Histórico do caixa"
          onClose={() => {
            setOpen(false);
            if (initialOpen)
              router.replace(`/caixas/${boxId}`, { scroll: false });
          }}
        >
          {children}
        </Modal>
      )}
    </>
  );
}
