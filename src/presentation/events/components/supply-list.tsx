"use client";
import { deleteSupplyAction } from "@/server/events/actions/delete-supply.action";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { SupplyActionsMenu } from "./supply-actions-menu";
import { SupplyDetailsModal } from "./supply-details-modal";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventSupply } from "@/server/events/models/event-supply.model";
import { receiveSupplyAction } from "@/server/events/actions/receive-supply.action";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { formatCurrency } from "@/shared/formatting/currency";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProductIcon } from "@/components/ui/product-icon";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorModal } from "@/components/modals/error-modal";
import { SupplyFormModal } from "./supply-form-modal";
import styles from "./supply-list.module.css";
export type SupplyListEntry = Omit<
  EventSupply,
  "receiptKey" | "fingerprint" | "receipts"
> & {
  hasReceipt: boolean;
  receipts: Omit<EventSupply["receipts"][number], "key">[];
};
export function SupplyList({
  eventId,
  eventName,
  supplies,
  cashBoxes,
}: {
  eventId: string;
  eventName: string;
  supplies: SupplyListEntry[];
  cashBoxes: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplyListEntry | null>(null);
  const [details, setDetails] = useState<SupplyListEntry | null>(null);
  const [deleting, setDeleting] = useState<SupplyListEntry | null>(null);
  const router = useRouter();
  const notify = useToast();
  const { execute, pending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a operação. Confira os insumos antes de repetir.",
  });
  return (
    <>
      <PageHeader
        title="Insumos"
        description={`Evento: ${eventName}`}
        compactActionsOnMobile
        actions={
          <Button
            mobileIcon={<Icon name="plus" />}
            aria-label="Adicionar insumo"
            title="Adicionar insumo"
            disabled={pending}
            onClick={() => setOpen(true)}
          >
            Adicionar insumo
          </Button>
        }
      />
      <ul className={styles.list} aria-label="Insumos do evento">
        {supplies.map((supply) => (
          <li key={supply.id} className={styles.card}>
            <div className={styles.details}>
              <button
                type="button"
                className={styles.name}
                aria-label={`Ver detalhes de ${supply.name}`}
                disabled={pending}
                onClick={() => setDetails(supply)}
              >
                <ProductIcon name={supply.icon} />
                <span>{supply.name}</span>
              </button>
              <p className={`balance-value ${styles.amount}`}>
                {formatCurrency(supply.amountCents)}
              </p>
              <p className="record-meta">
                {supply.source === "donation" ? (
                  <span className="muted">
                    Doação · {supply.received ? "Recebido" : "Pendente"}
                  </span>
                ) : (
                  <Link
                    className={`text-link ${styles.originLink}`}
                    href={`/caixas/${supply.cashBoxId}`}
                  >
                    {supply.cashBoxName}
                  </Link>
                )}
              </p>
              {supply.source === "donation" && supply.donorName && (
                <p className="record-meta">Doado por {supply.donorName}</p>
              )}
            </div>
            <div className={`action-group ${styles.actions}`}>
              <SupplyActionsMenu
                name={supply.name}
                disabled={pending}
                onDetails={() => setDetails(supply)}
                onEdit={() => setEditing(supply)}
                onDelete={() => setDeleting(supply)}
              />
              {supply.source === "donation" && !supply.received && (
                <Button
                  variant="neutral"
                  disabled={pending}
                  mobileIcon={<Icon name="check" />}
                  aria-label={`Marcar ${supply.name} como recebido`}
                  title="Marcar recebido"
                  onClick={() =>
                    execute(
                      () =>
                        receiveSupplyAction(eventId, supply.id, supply.version),
                      () => {
                        notify("Doação recebida.");
                        router.refresh();
                      },
                    )
                  }
                >
                  Marcar recebido
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <ErrorModal error={error} onClose={closeError} />
      {details && (
        <SupplyDetailsModal
          eventId={eventId}
          supply={details}
          onClose={() => setDetails(null)}
        />
      )}
      {deleting && (
        <ConfirmationModal
          title="Excluir insumo?"
          message={`Excluir “${deleting.name}”? ${deleting.source === "purchase" ? `O valor de ${formatCurrency(deleting.amountCents)} voltará ao caixa ${deleting.cashBoxName}.` : "A doação será retirada da lista, sem alterar os saldos."} O histórico será preservado.`}
          confirmLabel="Excluir insumo"
          busy={pending}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            execute(
              () => deleteSupplyAction(eventId, deleting.id, deleting.version),
              () => {
                setDeleting(null);
                notify("Insumo excluído.");
                router.refresh();
              },
            )
          }
        />
      )}
      {(open || editing) && (
        <SupplyFormModal
          key={editing?.id ?? "new"}
          eventId={eventId}
          supply={editing ?? undefined}
          cashBoxes={cashBoxes}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setOpen(false);
            setEditing(null);
            notify(editing ? "Insumo atualizado." : "Insumo registrado.");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
