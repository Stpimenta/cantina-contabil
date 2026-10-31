"use client";

import type { CashBoxHistoryEntry } from "@/server/cash-boxes/models/cash-box-history-entry.model";
import { formatDateOnly, formatDateTime } from "@/shared/formatting/date-time";
import { formatCurrency } from "@/shared/formatting/currency";
import { EventAuditDetails } from "@/presentation/events/components/event-audit-details";
import { DonationSnapshot } from "@/presentation/donations/components/donation-snapshot";
import { MovementSnapshot } from "@/presentation/movements/components/movement-snapshot";
import { Modal } from "./modal";
import { Button } from "../ui/button";

export function CashBoxHistoryEntryModal({
  entry,
  actionLabel,
  onClose,
}: {
  entry: CashBoxHistoryEntry;
  actionLabel: string;
  onClose: () => void;
}) {
  if (entry.donationDetails)
    return (
      <Modal
        open
        title={actionLabel}
        onClose={onClose}
        footer={
          <Button variant="neutral" onClick={onClose}>
            Fechar
          </Button>
        }
      >
        <div className="stack">
          <p className="muted record-meta">
            {entry.actorName} · {formatDateTime(entry.occurredAt)}
          </p>
          {entry.donationDetails.before && (
            <section className="stack-small">
              <h2>Antes</h2>
              <DonationSnapshot value={entry.donationDetails.before} />
            </section>
          )}
          <section className="stack-small">
            <h2>{entry.donationDetails.before ? "Depois" : "Doação"}</h2>
            <DonationSnapshot value={entry.donationDetails.after} />
          </section>
        </div>
      </Modal>
    );
  if (entry.movementDetails)
    return (
      <Modal
        open
        title={actionLabel}
        onClose={onClose}
        footer={
          <Button variant="neutral" onClick={onClose}>
            Fechar
          </Button>
        }
      >
        <div className="stack">
          <p className="muted record-meta">
            {entry.actorName} · {formatDateTime(entry.occurredAt)}
          </p>
          {entry.movementDetails.before && (
            <section className="stack-small">
              <h2>Antes</h2>
              <MovementSnapshot value={entry.movementDetails.before} />
            </section>
          )}
          <section className="stack-small">
            <h2>{entry.movementDetails.before ? "Depois" : "Movimentação"}</h2>
            <MovementSnapshot value={entry.movementDetails.after} />
          </section>
        </div>
      </Modal>
    );
  if (entry.eventDetails)
    return (
      <Modal
        open
        title={actionLabel}
        onClose={onClose}
        footer={
          <Button variant="neutral" onClick={onClose}>
            Fechar
          </Button>
        }
      >
        <EventAuditDetails
          entry={{
            ...entry.eventDetails,
            actorName: entry.actorName,
            occurredAt: entry.occurredAt,
          }}
        />
      </Modal>
    );
  const donation = entry.action === "donation";
  return (
    <Modal
      open
      title={donation ? "Detalhes da doação" : actionLabel}
      onClose={onClose}
      footer={
        <Button variant="neutral" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <dl className="details">
        {donation && (
          <>
            <div>
              <dt>Valor recebido</dt>
              <dd className="balance-value">
                {entry.amountCents === null
                  ? "Não informado"
                  : formatCurrency(entry.amountCents)}
              </dd>
            </div>
            <div>
              <dt>Data da doação</dt>
              <dd>
                {entry.donatedOn
                  ? formatDateOnly(entry.donatedOn)
                  : "Não informada"}
              </dd>
            </div>
            <div>
              <dt>Doador</dt>
              <dd className="preserve-lines">
                {entry.donorName || "Não informado"}
              </dd>
            </div>
            <div>
              <dt>Observação</dt>
              <dd className="preserve-lines">
                {entry.note || "Não informada"}
              </dd>
            </div>
          </>
        )}
        <div>
          <dt>Registrado por</dt>
          <dd>{entry.actorName}</dd>
        </div>
        <div>
          <dt>Data do registro</dt>
          <dd>{formatDateTime(entry.occurredAt)}</dd>
        </div>
        {!donation && (
          <>
            {entry.before && (
              <>
                <div>
                  <dt>Nome anterior</dt>
                  <dd className="preserve-lines">{entry.before.name}</dd>
                </div>
                <div>
                  <dt>Descrição anterior</dt>
                  <dd className="preserve-lines">
                    {entry.before.description || "Não informada"}
                  </dd>
                </div>
              </>
            )}
            {entry.after && (
              <>
                <div>
                  <dt>
                    {entry.before ? "Nome após o evento" : "Nome do caixa"}
                  </dt>
                  <dd className="preserve-lines">{entry.after.name}</dd>
                </div>
                <div>
                  <dt>
                    {entry.before ? "Descrição após o evento" : "Descrição"}
                  </dt>
                  <dd className="preserve-lines">
                    {entry.after.description || "Não informada"}
                  </dd>
                </div>
                {entry.after.deletedAt && (
                  <div>
                    <dt>Data da exclusão</dt>
                    <dd>{formatDateTime(entry.after.deletedAt)}</dd>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </dl>
    </Modal>
  );
}
