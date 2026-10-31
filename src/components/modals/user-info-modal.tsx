"use client";

import type { Session } from "@/server/auth/models/session.model";
import { roleLabels } from "@/server/auth/models/role.model";
import { Modal } from "./modal";
import { Button } from "../ui/button";
import {
  formatBirthDate,
  formatPhone,
} from "@/server/users/models/profile-details";

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
          <dt>Data de nascimento</dt>
          <dd>{formatBirthDate(session.user.birthDate)}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>
            {formatPhone(session.user.phoneCountry, session.user.phoneNumber)}
          </dd>
        </div>
        <div>
          <dt>Perfil de acesso</dt>
          <dd>{roleLabels[session.role]}</dd>
        </div>
      </dl>
    </Modal>
  );
}
