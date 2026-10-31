"use client";
import styles from "./order-form-modal.module.css";
import { validateSaveOrder } from "@/server/events/inputs/save-order.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { useId, useState, type FormEvent } from "react";
import type { Event as CantinaEvent } from "@/server/events/models/event.model";
import type { EventOrder } from "@/server/events/models/event-order.model";
import { createOrderAction } from "@/server/events/actions/create-order.action";
import { updateOrderAction } from "@/server/events/actions/update-order.action";
import { parseMoney, moneyInputValue } from "@/shared/validation/money-input";
import { formatCurrency } from "@/shared/formatting/currency";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { Modal } from "@/components/modals/modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Field } from "@/components/ui/field";
import { MoneyField } from "@/components/ui/money-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { SelectField } from "@/components/ui/select-field";
import { ProductIcon } from "@/components/ui/product-icon";
import { Icon } from "@/components/ui/icon";
export function OrderFormModal({
  event,
  order,
  onClose,
  onSaved,
}: {
  event: CantinaEvent;
  order?: EventOrder;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [requestId] = useState(() => crypto.randomUUID());
  const [customerName, setCustomerName] = useState(order?.customerName ?? "");
  const [note, setNote] = useState(order?.note ?? "");
  const [items, setItems] = useState(
    order?.items.map((p) => ({
      key: p.id,
      productId: p.id,
      quantity: String(p.quantity),
    })) ?? [],
  );
  const products = [
    ...(order?.items ?? []),
    ...event.products.filter(
      (p) => !order?.items.some((old) => old.id === p.id),
    ),
  ];
  const subtotalBig = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    const quantity = Number(item.quantity);
    return product && Number.isSafeInteger(quantity) && quantity > 0
      ? sum + BigInt(product.priceCents) * BigInt(quantity)
      : sum;
  }, 0n);
  const subtotal =
    subtotalBig <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(subtotalBig) : null;
  const originalSubtotal =
    order?.items.reduce(
      (sum, p) => sum + BigInt(p.priceCents) * BigInt(p.quantity),
      0n,
    ) ?? 0n;
  const [manualTotal, setManualTotal] = useState<string | null>(
    order && BigInt(order.totalCents) !== originalSubtotal
      ? moneyInputValue(order.totalCents)
      : null,
  );
  const total =
    manualTotal ?? (subtotal === null ? "" : moneyInputValue(subtotal));
  const totalCents = parseMoney(total);
  const [paid, setPaid] = useState(order?.paid ?? false);
  const [method, setMethod] = useState(
    order?.cashCents && order?.pixCents
      ? "mixed"
      : order?.pixCents
        ? "pix"
        : order
          ? "cash"
          : "pix",
  );
  const [cash, setCash] = useState(
    order ? moneyInputValue(order.cashCents) : "0,00",
  );
  const mixedCash = parseMoney(cash);
  const mixedPix =
    totalCents !== null && mixedCash !== null
      ? Math.max(0, totalCents - mixedCash)
      : 0;
  const [discard, setDiscard] = useState(false);
  const fieldIds: Record<string, string> = { customerName: `${id}-name` };
  items.forEach((_, i) => {
    fieldIds[`items.${i}.productId`] = `${id}-product-${items[i].productId}`;
    fieldIds[`items.${i}.quantity`] = `${id}-product-${items[i].productId}`;
  });
  Object.assign(fieldIds, {
    items: `${id}-product-${products[0]?.id}`,
    total: `${id}-total`,
    cash: method === "mixed" ? `${id}-cash` : `${id}-method`,
    pix: `${id}-cash`,
    note: `${id}-note`,
  });
  const input = {
    requestId,
    catalogVersion: event.version,
    customerName,
    note,
    items: items.map(({ productId, quantity }) => ({
      productId,
      quantity: Number(quantity),
    })),
    total,
    paid,
    cash: !paid
      ? "0"
      : method === "cash"
        ? total
        : method === "pix"
          ? "0"
          : cash,
    pix: !paid
      ? "0"
      : method === "pix"
        ? total
        : method === "cash"
          ? "0"
          : moneyInputValue(mixedPix),
  };
  const { execute, pending, isPending, error, fields, closeError } =
    useServerAction({
      validationKey: JSON.stringify(input),
      validate: () => {
        const result = validateSaveOrder(input);
        return result.ok ? null : presentBusinessFailure(result.error);
      },
      connectionMessage:
        "Não foi possível confirmar a gravação. Confira os pedidos antes de repetir.",
      fieldIds,
    });
  const groupError = Object.keys(fields ?? {}).some((key) =>
    key.startsWith("items."),
  )
    ? undefined
    : fields?.items;
  const state = JSON.stringify({
    customerName,
    note,
    items,
    total,
    paid,
    method,
    cash,
  });
  const [baseline] = useState(state);
  const dirty = state !== baseline;
  useUnsavedChanges(dirty);
  function adjustQuantity(productId: string, delta: number) {
    if (isPending()) return;
    setItems((current) => {
      const selected = current.find((item) => item.productId === productId);
      const quantity = Number(selected?.quantity ?? 0) + delta;
      if (!Number.isSafeInteger(quantity) || quantity < 0) return current;
      if (quantity === 0)
        return current.filter((item) => item.productId !== productId);
      if (selected)
        return current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: String(quantity) }
            : item,
        );
      return [
        ...current,
        { key: productId, productId, quantity: String(quantity) },
      ];
    });
  }
  function close() {
    if (isPending()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    execute(
      () =>
        order
          ? updateOrderAction(event.id, order.id, order.version, input)
          : createOrderAction(event.id, input),
      onSaved,
    );
  }
  return (
    <>
      <Modal
        open
        title={order ? "Editar pedido" : "Novo pedido"}
        size="form"
        onClose={close}
        footer={
          <>
            <Button variant="neutral" disabled={pending} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form={id} busy={pending}>
              Salvar pedido
            </Button>
          </>
        }
      >
        <form id={id} className="stack" noValidate onSubmit={submit}>
          <Field
            id={`${id}-name`}
            label="Nome da pessoa"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            maxLength={100}
            disabled={pending}
            error={fields?.customerName}
          />
          <section className="stack-small" aria-labelledby={`${id}-items`}>
            <h2 id={`${id}-items`}>Produtos</h2>
            <ul
              className={styles.productList}
              aria-describedby={groupError ? `${id}-items-error` : undefined}
            >
              {products.map((product) => {
                const index = items.findIndex(
                  (item) => item.productId === product.id,
                );
                const quantity = index < 0 ? 0 : Number(items[index].quantity);
                const rowError =
                  fields?.[`items.${index}.quantity`] ??
                  fields?.[`items.${index}.productId`];
                return (
                  <li key={product.id} className={styles.productRow}>
                    <div className={`stack-small ${styles.productInfo}`}>
                      <div className="inline">
                        <ProductIcon name={product.icon} />
                        <span
                          className={styles.productName}
                          title={product.name}
                        >
                          {product.name}
                        </span>
                      </div>
                      <p className="muted record-meta">
                        {formatCurrency(product.priceCents)} por unidade
                      </p>
                      <FieldError
                        id={`${id}-${product.id}-error`}
                        error={rowError}
                      />
                    </div>
                    <div
                      className="action-group"
                      role="group"
                      aria-label={`Quantidade de ${product.name}`}
                    >
                      <Button
                        type="button"
                        variant="neutral"
                        iconOnly
                        disabled={pending || quantity === 0}
                        aria-label={`Retirar uma unidade de ${product.name}`}
                        title="Retirar uma unidade"
                        onClick={() => adjustQuantity(product.id, -1)}
                      >
                        <Icon name="minus" />
                      </Button>
                      <output
                        aria-live="polite"
                        aria-label={`Quantidade de ${product.name}`}
                      >
                        {quantity}
                      </output>
                      <Button
                        id={`${id}-product-${product.id}`}
                        type="button"
                        variant="neutral"
                        iconOnly
                        disabled={
                          pending ||
                          quantity >= Number.MAX_SAFE_INTEGER ||
                          (quantity === 0 && items.length >= 100)
                        }
                        aria-label={`Adicionar uma unidade de ${product.name}`}
                        title="Adicionar uma unidade"
                        aria-describedby={
                          rowError
                            ? `${id}-${product.id}-error`
                            : groupError
                              ? `${id}-items-error`
                              : undefined
                        }
                        onClick={() => adjustQuantity(product.id, 1)}
                      >
                        <Icon name="plus" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <FieldError id={`${id}-items-error`} error={groupError} />
          </section>
          <p className="muted">
            Total dos produtos:{" "}
            {subtotal === null
              ? "Valor acima do limite"
              : formatCurrency(subtotal)}
          </p>
          <div className="form-grid">
            <MoneyField
              id={`${id}-total`}
              label="Valor do pedido (R$)"
              value={total}
              onValueChange={setManualTotal}
              required
              disabled={pending}
              error={fields?.total}
            />
            <SelectField
              id={`${id}-paid`}
              label="Pagamento"
              value={paid ? "paid" : "pending"}
              onValueChange={(v) => setPaid(v === "paid")}
              disabled={pending}
              options={[
                { value: "pending", label: "Pendente" },
                { value: "paid", label: "Pago" },
              ]}
            />
            {paid && (
              <>
                <SelectField
                  id={`${id}-method`}
                  label="Forma de pagamento"
                  value={method}
                  onValueChange={setMethod}
                  disabled={pending}
                  error={method !== "mixed" ? fields?.cash : undefined}
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
                      error={fields?.cash ?? fields?.pix}
                    />
                    <p>
                      Pix:{" "}
                      <span className="balance-value">
                        {formatCurrency(mixedPix)}
                      </span>
                    </p>
                  </>
                )}
              </>
            )}
          </div>
          <TextareaField
            id={`${id}-note`}
            label="Observação (opcional)"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={pending}
            error={fields?.note}
          />
          <span className="sr-only" role="status">
            {pending ? "Salvando pedido" : ""}
          </span>
        </form>
      </Modal>
      <ErrorModal error={error} onClose={closeError} />
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="O pedido ainda não foi salvo."
          confirmLabel="Descartar"
          onConfirm={onClose}
          onCancel={() => setDiscard(false)}
        />
      )}
    </>
  );
}
