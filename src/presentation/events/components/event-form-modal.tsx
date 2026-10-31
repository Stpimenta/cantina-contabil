"use client";
import styles from "./event-form-modal.module.css";
import { validateSaveEvent } from "@/server/events/inputs/save-event.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { useId, useState, type FormEvent } from "react";
import type { Event as CantinaEvent } from "@/server/events/models/event.model";
import type { SaveEventInput } from "@/server/events/inputs/save-event.input";
import { createEventAction } from "@/server/events/actions/create-event.action";
import { updateEventAction } from "@/server/events/actions/update-event.action";
import { moneyInputValue } from "@/shared/validation/money-input";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { Modal } from "@/components/modals/modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ProductIconModal } from "@/components/modals/product-icon-modal";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Field } from "@/components/ui/field";
import { MoneyField } from "@/components/ui/money-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { DateField } from "@/components/ui/date-field";
import { SelectField } from "@/components/ui/select-field";
import { ProductIcon } from "@/components/ui/product-icon";
import { Icon } from "@/components/ui/icon";
import { productIconLabel } from "@/shared/products/product-icons";
export function EventFormModal({
  event,
  cashBoxes,
  today,
  onClose,
  onSaved,
}: {
  event?: CantinaEvent;
  cashBoxes: { id: string; name: string }[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [requestId] = useState(() => crypto.randomUUID());
  const initial: Omit<SaveEventInput, "requestId"> = {
    cashBoxId: event?.cashBoxId ?? "",
    name: event?.name ?? "",
    description: event?.description ?? "",
    occursOn: event?.occursOn ?? today,
    products:
      event?.products.map((p) => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        price: moneyInputValue(p.priceCents),
      })) ?? [],
  };
  const [input, setInput] = useState(initial);
  const [baseline] = useState(() => JSON.stringify(initial));
  const [discard, setDiscard] = useState(false);
  const [iconIndex, setIconIndex] = useState<number | null>(null);
  const fieldIds: Record<string, string> = {
    name: `${id}-name`,
    cashBoxId: `${id}-box`,
    occursOn: `${id}-date`,
    description: `${id}-description`,
  };
  input.products.forEach((_, i) => {
    fieldIds[`products.${i}.name`] = `${id}-product-${i}-name`;
    fieldIds[`products.${i}.price`] = `${id}-product-${i}-price`;
    fieldIds[`products.${i}.icon`] = `${id}-product-${i}-icon`;
  });
  fieldIds.products = input.products.length
    ? `${id}-product-0-name`
    : `${id}-products-add`;
  const { execute, pending, isPending, error, fields, closeError } =
    useServerAction({
      validationKey: JSON.stringify(input),
      validate: () => {
        const result = validateSaveEvent({ ...input, requestId });
        return result.ok ? null : presentBusinessFailure(result.error);
      },
      connectionMessage:
        "Não foi possível confirmar a gravação. Confira os eventos antes de repetir.",
      fieldIds,
    });
  const groupError = Object.keys(fields ?? {}).some((key) =>
    key.startsWith("products."),
  )
    ? undefined
    : fields?.products;
  const dirty = JSON.stringify(input) !== baseline;
  useUnsavedChanges(dirty);
  const change = <K extends keyof typeof input>(
    key: K,
    value: (typeof input)[K],
  ) => setInput((current) => ({ ...current, [key]: value }));
  function product(
    index: number,
    values: Partial<SaveEventInput["products"][number]>,
  ) {
    change(
      "products",
      input.products.map((p, i) => (i === index ? { ...p, ...values } : p)),
    );
  }
  function removeProduct(index: number) {
    const products = input.products.filter((_, i) => i !== index);
    change("products", products);
    requestAnimationFrame(() => {
      const next = products.length
        ? `${id}-product-${Math.min(index, products.length - 1)}-name`
        : `${id}-products-add`;
      document.getElementById(next)?.focus();
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
        event
          ? updateEventAction(event.id, event.version, { ...input, requestId })
          : createEventAction({ ...input, requestId }),
      onSaved,
    );
  }
  return (
    <>
      <Modal
        size="form"
        open
        title={event ? "Editar evento" : "Novo evento"}
        onClose={close}
        footer={
          <>
            <Button variant="neutral" disabled={pending} onClick={close}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={id}
              busy={pending}
              disabled={!cashBoxes.length}
            >
              Salvar evento
            </Button>
          </>
        }
      >
        <form id={id} className="stack" noValidate onSubmit={submit}>
          {!cashBoxes.length && (
            <p>Cadastre um caixa antes de criar um evento.</p>
          )}
          <div className="form-grid">
            <div className="form-full">
              <Field
                id={`${id}-name`}
                label="Nome do evento"
                value={input.name}
                onChange={(e) => change("name", e.target.value)}
                maxLength={100}
                required
                disabled={pending}
                error={fields?.name}
              />
            </div>
            <SelectField
              id={`${id}-box`}
              label="Caixa"
              value={input.cashBoxId}
              onValueChange={(v) => change("cashBoxId", v)}
              options={[
                { value: "", label: "Selecione um caixa" },
                ...cashBoxes.map((b) => ({ value: b.id, label: b.name })),
              ]}
              required
              disabled={pending || !!event}
              error={fields?.cashBoxId}
            />
            <DateField
              id={`${id}-date`}
              name="occursOn"
              label="Data do evento"
              value={input.occursOn}
              onValueChange={(v) => change("occursOn", v)}
              required
              disabled={pending}
              error={fields?.occursOn}
            />
            <div className="form-full">
              <TextareaField
                id={`${id}-description`}
                label="Descrição (opcional)"
                value={input.description}
                onChange={(e) => change("description", e.target.value)}
                maxLength={500}
                disabled={pending}
                error={fields?.description}
              />
            </div>
          </div>
          <section className="stack-small" aria-labelledby={`${id}-products`}>
            <h2 id={`${id}-products`}>Produtos</h2>
            <ul
              className="record-list"
              aria-describedby={groupError ? `${id}-products-error` : undefined}
            >
              {input.products.map((p, i) => (
                <li key={p.id} className="record-row">
                  <div className={styles.product}>
                    <div className={styles.name}>
                      <Field
                        id={`${id}-product-${i}-name`}
                        label="Nome do produto"
                        value={p.name}
                        maxLength={100}
                        onChange={(e) => product(i, { name: e.target.value })}
                        required
                        disabled={pending}
                        error={fields?.[`products.${i}.name`]}
                      />
                    </div>
                    <div className={styles.price}>
                      <MoneyField
                        id={`${id}-product-${i}-price`}
                        label="Preço (R$)"
                        value={p.price}
                        onValueChange={(price) => product(i, { price })}
                        required
                        disabled={pending}
                        error={fields?.[`products.${i}.price`]}
                      />
                    </div>
                    <div className={styles.icon}>
                      <span className={styles.label}>Ícone</span>
                      <Button
                        id={`${id}-product-${i}-icon`}
                        type="button"
                        variant="neutral"
                        iconOnly
                        disabled={pending}
                        aria-haspopup="dialog"
                        aria-label={`Escolher ícone do produto ${i + 1}. Atual: ${productIconLabel(p.icon)}`}
                        title={`Ícone atual: ${productIconLabel(p.icon)}`}
                        onClick={() => setIconIndex(i)}
                      >
                        <ProductIcon name={p.icon} />
                      </Button>
                    </div>
                    <div className={styles.remove}>
                      <Button
                        type="button"
                        variant="ghost"
                        iconOnly
                        disabled={pending}
                        aria-label={`Remover produto ${i + 1}${p.name ? `: ${p.name}` : ""}`}
                        title="Remover produto"
                        onClick={() => removeProduct(i)}
                      >
                        <Icon name="close" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              aria-describedby={groupError ? `${id}-products-error` : undefined}
              id={`${id}-products-add`}
              type="button"
              variant="neutral"
              disabled={pending || input.products.length >= 100}
              onClick={() =>
                change("products", [
                  ...input.products,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    icon: "meal",
                    price: "",
                  },
                ])
              }
            >
              <Icon name="plus" />
              Adicionar produto
            </Button>
            <FieldError id={`${id}-products-error`} error={groupError} />
          </section>
          <span className="sr-only" role="status">
            {pending ? "Salvando evento" : ""}
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
      {iconIndex !== null && input.products[iconIndex] && (
        <ProductIconModal
          value={input.products[iconIndex].icon}
          onClose={() => setIconIndex(null)}
          onChoose={(icon) => {
            product(iconIndex, { icon });
            setIconIndex(null);
          }}
        />
      )}
    </>
  );
}
