"use client";

import { Navigation } from "../layout/navigation";
import { Modal } from "./modal";

export function NavigationModal({
  id,
  open,
  onClose,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      id={id}
      open={open}
      title="Menu"
      onClose={onClose}
      variant="navigation"
    >
      <Navigation onNavigate={onClose} />
    </Modal>
  );
}
