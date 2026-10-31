"use client";
import styles from "./order-list.module.css";
import { deleteOrderAction } from "@/server/events/actions/delete-order.action";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useRouter } from "next/navigation";
import type { Event } from "@/server/events/models/event.model";
import type { EventOrder } from "@/server/events/models/event-order.model";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency } from "@/shared/formatting/currency";
import { OrderFormModal } from "./order-form-modal";
export function OrderList({
  event,
  orders,
  search,
}: {
  event: Event;
  orders: EventOrder[];
  search?: ReactNode;
}) {
  const [selected, setSelected] = useState<EventOrder | "new" | null>(null);
  const [deleting, setDeleting] = useState<EventOrder | null>(null);
  const { execute, pending, isPending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a exclusão. Confira os pedidos antes de tentar novamente.",
  });
  const router = useRouter();
  const notify = useToast();
  return (
    <>
      <PageHeader
        title="Pedidos"
        description={`Evento: ${event.name}`}
        compactActionsOnMobile
        actions={
          <Button
            mobileIcon={<Icon name="plus" />}
            disabled={pending}
            aria-label="Adicionar pedido"
            title="Adicionar pedido"
            onClick={() => setSelected("new")}
          >
            Adicionar pedido
          </Button>
        }
      />
      {search}
      <ul className="record-list" aria-label="Pedidos do evento">
        {orders.map((order) => (
          <li key={order.id} className="record-row">
            <div className={`stack-small ${styles.content}`}>
              <p>{order.customerName}</p>
              <p className="muted record-meta">
                {order.paid ? "Pago" : "Pendente"} ·{" "}
                {formatCurrency(order.totalCents)}
              </p>
              <p className="record-meta">
                {order.items
                  .map((p) => `${p.quantity} × ${p.name}`)
                  .join(" · ")}
              </p>
              {order.note && (
                <p className={`muted ${styles.note}`}>{order.note}</p>
              )}
            </div>
            <div className="action-group">
              <Button
                disabled={pending}
                variant="neutral"
                iconBreakpoint="tablet"
                mobileIcon={<Icon name="edit" />}
                aria-label={`Editar pedido de ${order.customerName}`}
                title="Editar pedido"
                onClick={() => setSelected(order)}
              >
                Editar
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                iconBreakpoint="tablet"
                mobileIcon={<Icon name="trash" />}
                aria-label={`Excluir pedido de ${order.customerName}`}
                title="Excluir pedido"
                onClick={() => setDeleting(order)}
              >
                <Icon name="trash" />
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {deleting && (
        <ConfirmationModal
          title="Excluir pedido?"
          message={`Excluir o pedido de “${deleting.customerName}”? O valor de ${formatCurrency(deleting.totalCents)} será retirado do saldo ${deleting.paid ? "real" : "pendente"}. O histórico será preservado. Esta ação não registra devolução de dinheiro.`}
          confirmLabel="Excluir pedido"
          busy={pending}
          onCancel={() => {
            if (!isPending()) setDeleting(null);
          }}
          onConfirm={() =>
            execute(
              () => deleteOrderAction(event.id, deleting.id, deleting.version),
              () => {
                setDeleting(null);
                notify("Pedido excluído.");
                router.refresh();
              },
            )
          }
        />
      )}
      <ErrorModal error={error} onClose={closeError} />
      {selected && (
        <OrderFormModal
          event={event}
          order={selected === "new" ? undefined : selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            notify(
              selected === "new" ? "Pedido registrado." : "Pedido atualizado.",
            );
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
