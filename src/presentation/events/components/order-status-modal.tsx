"use client";
import { OrderReceiptUpload } from "./order-receipt-upload";
import { receiptMetadata } from "@/shared/receipts/receipt-input";
import { createRequestId } from "@/shared/identifiers/request-id";
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
import { OrderStockShortageModal } from "@/presentation/products/components/order-stock-shortage-modal";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { MoneyField } from "@/components/ui/money-field";
export function OrderStatusModal({
  order,
  deliveryEnabled,
  recurring = false,
  standard = false,
  canteen = false,
  onClose,
  onSaved,
}: {
  order: EventOrder;
  deliveryEnabled: boolean;
  recurring?: boolean;
  standard?: boolean;
  canteen?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [requestId] = useState(() => createRequestId());
  const [files, setFiles] = useState<File[]>([]);
  const [keptReceipts, setKeptReceipts] = useState(order.receipts ?? []);
  const receiptsChanged =
    files.length > 0 || keptReceipts.length !== (order.receipts?.length ?? 0);
  const [paid, setPaid] = useState(order.paid);
  const initialFulfilled =
    recurring || standard
      ? order.items.every(
          (p) =>
            (order.withdrawals?.find((w) => w.productId === p.id)?.quantity ??
              0) === p.quantity,
        )
      : canteen
        ? !!order.collected
        : order.fulfilled;
  const [fulfillmentTouched, setFulfillmentTouched] = useState(false);
  const [fulfilled, setFulfilled] = useState(initialFulfilled);
  const [method, setMethod] = useState("pix");
  const [cash, setCash] = useState("0,00");
  const [discard, setDiscard] = useState(false);
  const hasFulfillment =
    recurring ||
    standard ||
    canteen ||
    (deliveryEnabled && !!order.fulfillmentMode);
  const input = {
    requestId,
    ...(receiptsChanged
      ? {
          receipts: files.map(receiptMetadata),
          retainedReceiptIds: keptReceipts.map((receipt) => receipt.id),
        }
      : {}),
    ...(paid && !order.paid
      ? { payment: { method, cash: method === "mixed" ? cash : "0" } }
      : {}),
    ...(hasFulfillment && (fulfilled !== initialFulfilled || fulfillmentTouched)
      ? { fulfilled }
      : {}),
  };
  const changed =
    !!input.payment || input.fulfilled !== undefined || receiptsChanged;
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
        receipts: `${id}-receipts`,
        retainedReceiptIds: `${id}-receipts`,
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
  function attachments() {
    const form = new FormData();
    for (const file of files) form.append("receipts", file);
    return form;
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    execute(
      () =>
        updateOrderStatusAction(
          order.eventId,
          order.id,
          order.version,
          input,
          attachments(),
        ),
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
          <ul className="record-list" aria-label="Produtos do pedido">
            {order.items.map((item) => (
              <li key={item.id} className="record-meta">
                {item.quantity.toLocaleString("pt-BR")} × {item.name}
              </li>
            ))}
          </ul>
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
              onValueChange={(value) => {
                setFulfillmentTouched(true);
                setFulfilled(value === "done");
              }}
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
          <OrderReceiptUpload
            id={`${id}-receipts`}
            eventId={order.eventId}
            orderId={order.id}
            customerName={order.customerName}
            files={files}
            receipts={keptReceipts}
            onFilesChange={setFiles}
            onRemoveReceipt={(receiptId) =>
              setKeptReceipts((current) =>
                current.filter((receipt) => receipt.id !== receiptId),
              )
            }
            disabled={pending}
            error={fields?.receipts ?? fields?.retainedReceiptIds}
          />
          <span className="sr-only" role="status">
            {pending ? "Atualizando pedido" : ""}
          </span>
        </form>
      </Modal>
      {recurring &&
      error?.code === "STOCK_INSUFFICIENT" &&
      error.stockShortages?.length ? (
        <OrderStockShortageModal
          error={error}
          busy={pending}
          onConfirm={() => {
            if (isPending()) return;
            const stockConfirmation = error.stockShortages!.map(
              ({ productId, missing, available }) => ({
                productId,
                missing,
                available,
              }),
            );
            execute(
              () =>
                updateOrderStatusAction(
                  order.eventId,
                  order.id,
                  order.version,
                  { ...input, stockConfirmation },
                  attachments(),
                ),
              onSaved,
            );
          }}
          onClose={closeError}
        />
      ) : (
        <ErrorModal error={error} onClose={closeError} />
      )}
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
