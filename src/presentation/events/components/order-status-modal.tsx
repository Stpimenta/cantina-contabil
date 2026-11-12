"use client";
import styles from "./order-form-modal.module.css";
import { useId, useState, type FormEvent } from "react";
import type { EventOrder } from "@/server/events/models/event-order.model";
import { updateOrderStatusAction } from "@/server/events/actions/update-order-status.action";
import { validateUpdateOrderStatus } from "@/server/events/inputs/update-order-status.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { parseMoney } from "@/shared/validation/money-input";
import { formatCurrency } from "@/shared/formatting/currency";
import { Modal } from "@/components/modals/modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { MoneyField } from "@/components/ui/money-field";
export function OrderStatusModal({
  order,
  deliveryEnabled,
  onClose,
  onSaved,
}: {
  order: EventOrder;
  deliveryEnabled: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [requestId] = useState(() => crypto.randomUUID());
  const [paid, setPaid] = useState(order.paid);
  const [fulfilled, setFulfilled] = useState(order.fulfilled);
  const [method, setMethod] = useState("pix");
  const [cash, setCash] = useState("0,00");
  const [discard, setDiscard] = useState(false);
  const hasFulfillment = deliveryEnabled && !!order.fulfillmentMode;
  const input = {
    requestId,
    ...(paid && !order.paid
      ? { payment: { method, cash: method === "mixed" ? cash : "0" } }
      : {}),
    ...(hasFulfillment && fulfilled !== order.fulfilled ? { fulfilled } : {}),
  };
  const changed = !!input.payment || input.fulfilled !== undefined;
  const dirty = changed || method !== "pix" || cash !== "0,00";
  useUnsavedChanges(dirty);
  const { execute, pending, isPending, error, fields, closeError } =
    useServerAction({
      validationKey: JSON.stringify(input),
      validate: () => {
        const result = validateUpdateOrderStatus(input, order.totalCents);
        return result.ok ? null : presentBusinessFailure(result.error);
      },
      fieldIds: {
        status: `${id}-paid`,
        "payment.method": `${id}-method`,
        "payment.cash": `${id}-cash`,
        payment: `${id}-method`,
        fulfilled: `${id}-fulfilled`,
      },
      connectionMessage:
        "Não foi possível confirmar a atualização. Confira o pedido antes de repetir.",
    });
  function close() {
    if (isPending()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    execute(
      () =>
        updateOrderStatusAction(order.eventId, order.id, order.version, input),
      onSaved,
    );
  }
  const cashCents = parseMoney(cash);
  return (
    <>
      <Modal
        open
        title="Situação do pedido"
        onClose={close}
        footer={
          <div className={styles.formActions}>
            <Button variant="neutral" disabled={pending} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form={id} disabled={!changed} busy={pending}>
              Salvar
            </Button>
          </div>
        }
      >
        <form id={id} className="stack" noValidate onSubmit={submit}>
          <p>{order.customerName}</p>
          <p>
            Valor do pedido:{" "}
            <span className="balance-value">
              {formatCurrency(order.totalCents)}
            </span>
          </p>
          <SelectField
            id={`${id}-paid`}
            label="Pagamento"
            value={paid ? "paid" : "pending"}
            onValueChange={(value) => setPaid(value === "paid")}
            disabled={pending || order.paid}
            error={fields?.status}
            options={[
              { value: "pending", label: "Pendente" },
              { value: "paid", label: "Pago" },
            ]}
          />
          {paid && !order.paid && (
            <>
              <SelectField
                id={`${id}-method`}
                label="Forma de pagamento"
                value={method}
                onValueChange={setMethod}
                disabled={pending}
                error={
                  fields?.["payment.method"] ??
                  (!fields?.["payment.cash"] ? fields?.payment : undefined)
                }
                options={[
                  { value: "pix", label: "Pix" },
                  { value: "cash", label: "Dinheiro" },
                  { value: "mixed", label: "Dinheiro e Pix" },
                ]}
              />
              {method === "mixed" && (
                <>
                  <MoneyField
                    id={`${id}-cash`}
                    label="Dinheiro (R$)"
                    value={cash}
                    onValueChange={setCash}
                    disabled={pending}
                    error={fields?.["payment.cash"]}
                    required
                  />
                  {cashCents !== null && cashCents <= order.totalCents && (
                    <p>
                      Pix:{" "}
                      <span className="balance-value">
                        {formatCurrency(order.totalCents - cashCents)}
                      </span>
                    </p>
                  )}
                </>
              )}
            </>
          )}
          {hasFulfillment && (
            <SelectField
              id={`${id}-fulfilled`}
              label={
                order.fulfillmentMode === "delivery" ? "Entrega" : "Retirada"
              }
              value={fulfilled ? "done" : "pending"}
              onValueChange={(value) => setFulfilled(value === "done")}
              disabled={pending}
              error={fields?.fulfilled}
              options={
                order.fulfillmentMode === "delivery"
                  ? [
                      { value: "pending", label: "A entregar" },
                      { value: "done", label: "Entregue" },
                    ]
                  : [
                      { value: "pending", label: "A retirar" },
                      { value: "done", label: "Retirado" },
                    ]
              }
            />
          )}
          {deliveryEnabled && !order.fulfillmentMode && (
            <p className="muted">
              Defina Entrega ou Retirada na edição do pedido.
            </p>
          )}
          <span className="sr-only" role="status">
            {pending ? "Atualizando pedido" : ""}
          </span>
        </form>
      </Modal>
      <ErrorModal error={error} onClose={closeError} />
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="As alterações ainda não foram salvas."
          confirmLabel="Descartar"
          onConfirm={onClose}
          onCancel={() => setDiscard(false)}
        />
      )}
    </>
  );
}
