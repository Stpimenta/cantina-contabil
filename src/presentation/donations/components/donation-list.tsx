"use client";
import styles from "./donation-list.module.css";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { DonationSnapshot } from "./donation-snapshot";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DonationListItem } from "@/server/donations/models/donation-list-item.model";
import { deleteDonationAction } from "@/server/donations/actions/delete-donation.action";
import { DonationFormModal } from "@/components/modals/donation-form-modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { RecordActionsMenu } from "@/components/ui/record-actions-menu";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency } from "@/shared/formatting/currency";
import { formatDateOnly, formatDateTime } from "@/shared/formatting/date-time";
export function DonationList({
  items,
  cashBoxes,
  today,
}: {
  items: DonationListItem[];
  cashBoxes: { id: string; name: string }[];
  today: string;
}) {
  const [details, setDetails] = useState<DonationListItem | null>(null);
  const [editing, setEditing] = useState<DonationListItem | null>(null);
  const [deleting, setDeleting] = useState<DonationListItem | null>(null);
  const router = useRouter();
  const notify = useToast();
  const { execute, pending, isPending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a exclusão. Confira a lista de doações antes de tentar novamente.",
  });
  return (
    <>
      {items.length > 0 && (
        <ul className="record-list" aria-label="Doações">
          {items.map((donation) => (
            <li key={donation.id} className={`record-row ${styles.row}`}>
              <div className={`stack-small ${styles.content}`}>
                <button
                  type="button"
                  className="record-title text-link"
                  aria-label={`Ver detalhes da doação de ${formatCurrency(donation.amountCents)} para ${donation.cashBoxName}`}
                  onClick={() => setDetails(donation)}
                >
                  {donation.cashBoxName}
                </button>
                <p className={`balance-value ${styles.amount}`}>
                  {formatCurrency(donation.amountCents)}
                </p>
                <p className={styles.metadata}>
                  {formatDateOnly(donation.donatedOn)}
                  {donation.donorName ? ` · ${donation.donorName}` : ""}
                </p>
              </div>
              <div className="action-group">
                <RecordActionsMenu
                  name={`doação de ${formatCurrency(donation.amountCents)}`}
                  disabled={pending}
                  onEdit={() => setEditing(donation)}
                  onDelete={() => setDeleting(donation)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {details && (
        <Modal
          open
          title="Detalhes da doação"
          onClose={() => setDetails(null)}
          footer={
            <Button variant="neutral" onClick={() => setDetails(null)}>
              Fechar
            </Button>
          }
        >
          <div className="stack">
            <DonationSnapshot value={{ ...details }} />
            <dl className="details">
              <div>
                <dt>Registrado por</dt>
                <dd>
                  {details.createdByName} · {formatDateTime(details.createdAt)}
                </dd>
              </div>
              <div>
                <dt>Última alteração</dt>
                <dd>
                  {details.updatedByName} · {formatDateTime(details.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>
        </Modal>
      )}
      {editing && (
        <DonationFormModal
          donation={editing}
          cashBoxes={cashBoxes}
          today={today}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            notify("Doação atualizada.");
            router.refresh();
          }}
        />
      )}
      {deleting && (
        <ConfirmationModal
          title="Excluir doação?"
          message={`Excluir a doação de ${formatCurrency(deleting.amountCents)} do caixa “${deleting.cashBoxName}”? O valor será retirado do saldo real e o histórico preservado. A exclusão será bloqueada se o saldo ficar negativo.`}
          confirmLabel="Excluir doação"
          busy={pending}
          onCancel={() => {
            if (!isPending()) setDeleting(null);
          }}
          onConfirm={() => {
            const form = new FormData();
            form.set("id", deleting.id);
            form.set("version", String(deleting.version));
            execute(
              () => deleteDonationAction(form),
              () => {
                setDeleting(null);
                notify("Doação excluída.");
                router.refresh();
              },
            );
          }}
        />
      )}
      <ErrorModal error={error} onClose={closeError} />
    </>
  );
}
