"use client";
import {
  emptyOrderAddress,
  brazilianStates,
} from "@/server/events/inputs/order-delivery.input";
import { orderMapsUrl } from "@/shared/formatting/order-address";
import styles from "./order-form-modal.module.css";
import {
  orderSteps,
  orderStepForField,
  validateOrderForm,
  firstOrderErrorStep,
} from "../order-form-validation";
import { useEffect, useRef, useId, useState, type FormEvent } from "react";
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
import { Button, buttonClassName } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Field } from "@/components/ui/field";
import { BrazilianMaskedField } from "@/components/ui/brazilian-masked-field";
import { PostalCodeField } from "@/presentation/addresses/components/postal-code-field";
import { mergePostalAddress } from "@/presentation/addresses/merge-postal-address";
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
  const phased = event.deliveryEnabled;
  const [step, setStep] = useState(0);
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const skipStepFocus = useRef(false);
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      if (!skipStepFocus.current) stepTitle.current?.focus();
      skipStepFocus.current = false;
    }
  }, [step]);
  const [requestId] = useState(() => crypto.randomUUID());
  const [customerName, setCustomerName] = useState(order?.customerName ?? "");
  const [fulfillmentMode, setFulfillmentMode] = useState(
    order?.fulfillmentMode ?? "",
  );
  const [address, setAddress] = useState(
    order?.address ?? { ...emptyOrderAddress },
  );
  const [contactPhone, setContactPhone] = useState(order?.contactPhone ?? "");
  const [fulfilled, setFulfilled] = useState(order?.fulfilled ?? false);
  const mapsUrl = orderMapsUrl(address);
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
  });
  if (event.deliveryEnabled) {
    Object.assign(fieldIds, {
      fulfillmentMode: `${id}-fulfillment-mode`,
      fulfilled: `${id}-fulfilled`,
      contactPhone: `${id}-contact-phone`,
    });
    for (const field of [
      "postalCode",
      "state",
      "street",
      "number",
      "noNumber",
      "complement",
      "neighborhood",
      "city",
      "reference",
    ])
      fieldIds[`address.${field}`] = `${id}-address-${field}`;
    fieldIds.address = `${id}-address-street`;
  }
  fieldIds.note = `${id}-note`;
  const input = {
    requestId,
    catalogVersion: event.version,
    fulfillmentMode:
      event.deliveryEnabled && fulfillmentMode ? fulfillmentMode : null,
    address:
      event.deliveryEnabled && fulfillmentMode === "delivery" ? address : null,
    contactPhone: event.deliveryEnabled ? contactPhone : "",
    fulfilled: event.deliveryEnabled ? fulfilled : false,
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
  const {
    execute,
    pending,
    isPending,
    error,
    fields,
    closeError,
    showError,
    resetValidation,
  } = useServerAction({
    validationKey: JSON.stringify({ input, step }),
    validate: () => {
      return validateOrderForm(
        input,
        event.deliveryEnabled,
        phased ? step : undefined,
      );
    },
    connectionMessage:
      "Não foi possível confirmar a gravação. Confira os pedidos antes de repetir.",
    fieldIds: phased
      ? Object.fromEntries(
          Object.entries(fieldIds).sort(
            ([a], [b]) => orderStepForField(a) - orderStepForField(b),
          ),
        )
      : fieldIds,
    onServerError: (failure) => {
      const failedStep = firstOrderErrorStep(failure);
      if (phased && failedStep !== null && failedStep !== step) {
        skipStepFocus.current = true;
        setStep(failedStep);
      }
    },
  });
  const groupError = Object.keys(fields ?? {}).some((key) =>
    key.startsWith("items."),
  )
    ? undefined
    : fields?.items;
  const state = JSON.stringify({
    fulfillmentMode,
    address,
    contactPhone,
    fulfilled,
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
    if (isPending()) return;
    if (phased && step < 2) {
      const failure = validateOrderForm(input, true, step);
      if (failure) showError(failure);
      else {
        resetValidation();
        setStep(step + 1);
      }
      return;
    }
    const failure = validateOrderForm(input, event.deliveryEnabled);
    if (failure) {
      const failedStep = firstOrderErrorStep(failure);
      if (phased && failedStep !== null && failedStep !== step) {
        skipStepFocus.current = true;
        setStep(failedStep);
      }
      showError(failure);
      return;
    }
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
        size={phased ? "formCompact" : "form"}
        onClose={close}
        footer={
          <div className={styles.formActions}>
            <span
              className={`${styles.cancelAction}${phased ? ` ${styles.stepCancel}` : ""}`}
            >
              <Button variant="neutral" disabled={pending} onClick={close}>
                Cancelar
              </Button>
            </span>
            {phased && step > 0 && (
              <Button
                variant="neutral"
                disabled={pending}
                onClick={() => {
                  if (!isPending()) {
                    resetValidation();
                    setStep(step - 1);
                  }
                }}
              >
                Anterior
              </Button>
            )}
            <Button type="submit" form={id} busy={pending}>
              {phased && step < 2 ? "Próximo" : "Salvar pedido"}
            </Button>
          </div>
        }
      >
        <form id={id} className="stack" noValidate onSubmit={submit}>
          {phased && (
            <h2
              id={`${id}-step-title`}
              ref={stepTitle}
              tabIndex={-1}
              className={styles.stepTitle}
              aria-live="polite"
            >
              {step + 1} de 3 · {orderSteps[step]}
            </h2>
          )}
          <div hidden={phased && step !== 0}>
            <div className="stack">
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
                  aria-describedby={
                    groupError ? `${id}-items-error` : undefined
                  }
                >
                  {products.map((product) => {
                    const index = items.findIndex(
                      (item) => item.productId === product.id,
                    );
                    const quantity =
                      index < 0 ? 0 : Number(items[index].quantity);
                    const rowError =
                      fields?.[`items.${index}.quantity`] ??
                      fields?.[`items.${index}.productId`];
                    return (
                      <li key={product.id} className={styles.productRow}>
                        <div className={`stack-small ${styles.productInfo}`}>
                          <div className={`inline ${styles.productHeading}`}>
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
                          className={`action-group ${styles.productQuantity}`}
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
                            className={styles.productCount}
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
              {phased && (
                <>
                  {" "}
                  <TextareaField
                    id={`${id}-note`}
                    label="Observação (opcional)"
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={pending}
                    error={fields?.note}
                  />
                </>
              )}
            </div>
          </div>
          <div hidden={phased && step !== 1}>
            {event.deliveryEnabled && (
              <section className="stack" aria-labelledby={`${id}-step-title`}>
                <div className="form-grid">
                  <SelectField
                    id={`${id}-fulfillment-mode`}
                    label="Modalidade"
                    required
                    value={fulfillmentMode}
                    onValueChange={(v) => {
                      setFulfillmentMode(v);
                      setFulfilled(false);
                    }}
                    disabled={pending}
                    error={fields?.fulfillmentMode}
                    options={[
                      { value: "", label: "Selecione" },
                      { value: "delivery", label: "Entrega" },
                      { value: "pickup", label: "Retirada" },
                    ]}
                  />
                  {!!fulfillmentMode && (
                    <SelectField
                      id={`${id}-fulfilled`}
                      label="Situação"
                      value={fulfilled ? "done" : "pending"}
                      onValueChange={(v) => setFulfilled(v === "done")}
                      disabled={pending}
                      error={fields?.fulfilled}
                      options={
                        fulfillmentMode === "delivery"
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
                  <div className="form-full">
                    <BrazilianMaskedField
                      kind="phone"
                      id={`${id}-contact-phone`}
                      label="Telefone de contato (opcional)"
                      autoComplete="tel-national"
                      value={contactPhone}
                      onValueChange={setContactPhone}
                      disabled={pending}
                      error={fields?.contactPhone}
                    />
                  </div>
                </div>
                {fulfillmentMode === "delivery" && (
                  <div className="stack-small">
                    <h3>Endereço (opcional)</h3>
                    <div className="form-grid">
                      <PostalCodeField
                        active={step === 1 && !pending}
                        onAddressFound={(found) => {
                          const before = address;
                          setAddress((current) =>
                            mergePostalAddress(current, before, found),
                          );
                        }}
                        id={`${id}-address-postalCode`}
                        label="CEP (opcional)"
                        autoComplete="postal-code"
                        value={address.postalCode}
                        disabled={pending}
                        error={fields?.["address.postalCode"]}
                        onValueChange={(postalCode) =>
                          setAddress((a) => ({ ...a, postalCode }))
                        }
                      />
                      <SelectField
                        id={`${id}-address-state`}
                        label="UF"
                        value={address.state}
                        disabled={pending}
                        error={fields?.["address.state"]}
                        onValueChange={(v) =>
                          setAddress((a) => ({ ...a, state: v }))
                        }
                        options={[
                          { value: "", label: "Selecione" },
                          ...brazilianStates.map((value) => ({
                            value,
                            label: value,
                          })),
                        ]}
                      />
                      <div className="form-full">
                        <Field
                          id={`${id}-address-street`}
                          label="Rua / avenida"
                          autoComplete="address-line1"
                          maxLength={100}
                          value={address.street}
                          disabled={pending}
                          error={fields?.["address.street"]}
                          onChange={(e) =>
                            setAddress((a) => ({
                              ...a,
                              street: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Field
                        id={`${id}-address-number`}
                        label="Número"
                        maxLength={20}
                        value={address.number}
                        disabled={pending || address.noNumber}
                        error={fields?.["address.number"]}
                        onChange={(e) =>
                          setAddress((a) => ({ ...a, number: e.target.value }))
                        }
                      />
                      <SelectField
                        id={`${id}-address-noNumber`}
                        label="Sem número"
                        value={address.noNumber ? "yes" : "no"}
                        disabled={pending}
                        onValueChange={(v) =>
                          setAddress((a) => ({ ...a, noNumber: v === "yes" }))
                        }
                        options={[
                          { value: "no", label: "Não" },
                          { value: "yes", label: "Sim" },
                        ]}
                      />
                      <div className="form-full">
                        <Field
                          id={`${id}-address-complement`}
                          label="Complemento (opcional)"
                          autoComplete="address-line2"
                          maxLength={100}
                          value={address.complement}
                          disabled={pending}
                          error={fields?.["address.complement"]}
                          onChange={(e) =>
                            setAddress((a) => ({
                              ...a,
                              complement: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Field
                        id={`${id}-address-neighborhood`}
                        label="Bairro"
                        maxLength={100}
                        value={address.neighborhood}
                        disabled={pending}
                        error={fields?.["address.neighborhood"]}
                        onChange={(e) =>
                          setAddress((a) => ({
                            ...a,
                            neighborhood: e.target.value,
                          }))
                        }
                      />
                      <Field
                        id={`${id}-address-city`}
                        label="Cidade"
                        autoComplete="address-level2"
                        maxLength={100}
                        value={address.city}
                        disabled={pending}
                        error={fields?.["address.city"]}
                        onChange={(e) =>
                          setAddress((a) => ({ ...a, city: e.target.value }))
                        }
                      />
                      <div className="form-full">
                        <TextareaField
                          id={`${id}-address-reference`}
                          label="Ponto de referência (opcional)"
                          maxLength={500}
                          value={address.reference}
                          disabled={pending}
                          error={fields?.["address.reference"]}
                          onChange={(e) =>
                            setAddress((a) => ({
                              ...a,
                              reference: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    {fields?.address &&
                      !Object.keys(fields).some((key) =>
                        key.startsWith("address."),
                      ) && (
                        <FieldError
                          id={`${id}-address-error`}
                          error={fields.address}
                        />
                      )}
                    {mapsUrl && (
                      <div>
                        <a
                          className={buttonClassName({ variant: "neutral" })}
                          href={pending ? undefined : mapsUrl}
                          aria-disabled={pending || undefined}
                          tabIndex={pending ? -1 : undefined}
                          aria-label="Conferir no Google Maps (abre em outra aba)"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Conferir no Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
          <div hidden={phased && step !== 2}>
            <div className="stack">
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
            </div>
          </div>
          {!phased && (
            <>
              {" "}
              <TextareaField
                id={`${id}-note`}
                label="Observação (opcional)"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={pending}
                error={fields?.note}
              />
            </>
          )}
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
