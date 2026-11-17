"use client";

import type { Session } from "@/server/auth/models/session.model";
import { roleLabels } from "@/server/auth/models/role.model";
import { Modal } from "./modal";
import { Button } from "../ui/button";

export function UserInfoModal({
  open,
  onClose,
  session,
}: {
  open: boolean;
  onClose: () => void;
  session: Session;
}) {
  return (
    <Modal
      open={open}
      title="Meus dados"
      onClose={onClose}
      footer={
        <Button variant="neutral" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <dl className="details">
        <div>
          <dt>Nome</dt>
          <dd>{session.user.name}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{session.user.email || "Não informado"}</dd>
        </div>
        <div>
          <dt>Perfil de acesso</dt>
          <dd>{roleLabels[session.role]}</dd>
        </div>
      </dl>
    </Modal>
  );
}
