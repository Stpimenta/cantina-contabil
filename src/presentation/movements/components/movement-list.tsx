"use client";
import { ReceiptLink } from "@/components/ui/receipt-link";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Movement as StoredMovement } from "@/server/movements/models/movement.model";
export type MovementListEntry = Omit<
  StoredMovement,
  "fingerprint" | "receipts"
> & { receipts: Omit<StoredMovement["receipts"][number], "key">[] };
type Movement = MovementListEntry;
import { deleteMovementAction } from "@/server/movements/actions/delete-movement.action";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { formatCurrency } from "@/shared/formatting/currency";
import { formatDateOnly, formatDateTime } from "@/shared/formatting/date-time";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RecordActionsMenu } from "@/components/ui/record-actions-menu";
import { useToast } from "@/components/ui/toast-provider";
import { Modal } from "@/components/modals/modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { MovementFormModal } from "./movement-form-modal";
import { MovementSnapshot } from "./movement-snapshot";
import styles from "./movement-list.module.css";
export function MovementList({
  items,
  cashBoxes,
  today,
}: {
  items: Movement[];
  cashBoxes: { id: string; name: string }[];
  today: string;
}) {
  const [editing, setEditing] = useState<Movement | "new" | null>(null);
  const [details, setDetails] = useState<Movement | null>(null);
  const [deleting, setDeleting] = useState<Movement | null>(null);
  const router = useRouter();
  const notify = useToast();
  const { execute, pending, isPending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a exclusão. Confira a lista antes de tentar novamente.",
  });
  return (
    <>
      <PageHeader
        hideDescriptionOnMobile
        title="Movimentações"
        icon="movements"
        description="Entradas e saídas dos caixas"
        compactActionsOnMobile
        actions={
          <Button
            mobileIcon={<Icon name="plus" />}
            aria-label="Nova movimentação"
            title="Nova movimentação"
            disabled={pending}
            onClick={() => setEditing("new")}
          >
            Nova movimentação
          </Button>
        }
      />
      <ul className="record-list" aria-label="Movimentações dos caixas">
        {items.map((item) => (
          <li className="record-row" key={item.id}>
            <div className={`stack-small ${styles.content}`}>
              <p>
                {item.direction === "incoming" ? "Entrada" : "Saída"} ·{" "}
                <span className="balance-value">
                  {formatCurrency(item.amountCents)}
                </span>
              </p>
              <p className="record-meta">
                <Link className="text-link" href={`/caixas/${item.cashBoxId}`}>
                  {item.cashBoxName}
                </Link>{" "}
                · {formatDateOnly(item.occurredOn)}
              </p>
              <p className={`muted record-meta ${styles.reason}`}>
                {item.reason}
              </p>
            </div>
            <RecordActionsMenu
              name={`movimentação de ${formatCurrency(item.amountCents)}`}
              disabled={pending}
              onDetails={() => setDetails(item)}
              onEdit={() => setEditing(item)}
              onDelete={() => setDeleting(item)}
            />
          </li>
        ))}
      </ul>
      {editing && (
        <MovementFormModal
          movement={editing === "new" ? undefined : editing}
          cashBoxes={cashBoxes}
          today={today}
          onClose={() => setEditing(null)}
          onSaved={() => {
            notify(
              editing === "new"
                ? "Movimentação registrada."
                : "Movimentação atualizada.",
            );
            setEditing(null);
            router.refresh();
          }}
        />
      )}
      {details && (
        <Modal
          open
          title="Detalhes da movimentação"
          onClose={() => setDetails(null)}
          footer={
            <Button variant="neutral" onClick={() => setDetails(null)}>
              Fechar
            </Button>
          }
        >
          <div className="stack">
            <MovementSnapshot value={{ ...details }} />
            {details.receipts.length > 0 && (
              <div className="stack-small">
                <h2>Comprovantes</h2>
                {details.receipts.map((receipt, index) => (
                  <ReceiptLink
                    key={receipt.id}
                    src={`/movimentacoes/${details.id}/comprovante?receiptId=${encodeURIComponent(receipt.id)}`}
                    name="movimentação"
                    type={receipt.type}
                    label={`${receipt.type === "application/pdf" ? "Baixar" : "Ver"} comprovante ${index + 1}`}
                  />
                ))}
              </div>
            )}

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
      {deleting && (
        <ConfirmationModal
          title="Excluir movimentação?"
          message={`Excluir ${deleting.direction === "incoming" ? "a entrada" : "a saída"} de ${formatCurrency(deleting.amountCents)} do caixa “${deleting.cashBoxName}”? O saldo será recalculado e o histórico preservado. A operação será bloqueada se deixar o caixa negativo.`}
          confirmLabel="Excluir movimentação"
          busy={pending}
          onCancel={() => {
            if (!isPending()) setDeleting(null);
          }}
          onConfirm={() => {
            const form = new FormData();
            form.set("id", deleting.id);
            form.set("version", String(deleting.version));
            execute(
              () => deleteMovementAction(form),
              () => {
                notify("Movimentação excluída.");
                setDeleting(null);
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
