"use client";
import { ExistingProductsPicker } from "@/presentation/products/components/existing-products-picker";
import type { StockImportOption } from "@/server/products/models/stock-import-option.model";
import { loadStockImportOptionsAction } from "@/server/products/actions/shared-stock.action";
import { SharedStockIndicator } from "@/presentation/products/components/shared-stock-indicator";
import { checkProductRemovalAction } from "@/server/products/actions/check-product-removal.action";
import { createRequestId } from "@/shared/identifiers/request-id";
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
  sharedProductIds = [],
  recurring = event?.kind === "product_category",
  cashBoxes,
  today,
  onClose,
  onSaved,
}: {
  event?: CantinaEvent;
  sharedProductIds?: string[];
  recurring?: boolean;
  cashBoxes: { id: string; name: string }[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [requestId] = useState(() => createRequestId());
  const initial: Omit<SaveEventInput, "requestId"> = {
    stockImports: [],
    kind: recurring ? "product_category" : "event",
    cashBoxId: event?.cashBoxId ?? "",
    name: event?.name ?? "",
    description: event?.description ?? "",
    occursOn: recurring ? "" : (event?.occursOn ?? today),
    deliveryEnabled: event?.deliveryEnabled ?? false,
    canteenEnabled: event?.canteenEnabled ?? false,
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
  const [importOptions, setImportOptions] = useState<
    StockImportOption[] | null
  >(null);
  const [importLabels, setImportLabels] = useState<Record<string, string>>({});
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
  fieldIds.stockImports = `${id}-products-import`;
  const {
    execute,
    pending: saving,
    isPending: isSaving,
    error,
    fields,
    closeError,
  } = useServerAction({
    validationKey: JSON.stringify(input),
    validate: () => {
      const result = validateSaveEvent({ ...input, requestId });
      return result.ok ? null : presentBusinessFailure(result.error);
    },
    connectionMessage:
      "Não foi possível confirmar a gravação. Confira os eventos antes de repetir.",
    fieldIds,
  });
  const removal = useServerAction({
    connectionMessage: "Não foi possível verificar o produto. Tente novamente.",
  });
  const sources = useServerAction({
    connectionMessage:
      "Não foi possível consultar os produtos existentes. Tente novamente.",
  });
  const pending = saving || removal.pending || sources.pending;
  function isPending() {
    return isSaving() || removal.isPending() || sources.isPending();
  }
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
    if (isPending()) return;
    const selected = input.products[index];
    if (!selected) return;
    if (event?.products.some((p) => p.id === selected.id)) {
      removal.execute(
        () => checkProductRemovalAction(event.id, selected.id),
        () => removeProductRow(index),
      );
    } else removeProductRow(index);
  }
  function removeProductRow(index: number) {
    const products = input.products.filter((_, i) => i !== index);
    setInput((current) => ({
      ...current,
      products,
      stockImports: current.stockImports?.filter(
        (ref) => ref.productId !== input.products[index].id,
      ),
    }));
    requestAnimationFrame(() => {
      const next = products.length
        ? `${id}-product-${Math.min(index, products.length - 1)}-name`
        : `${id}-products-add`;
      document.getElementById(next)?.focus();
    });
  }
  function bringProducts(products: StockImportOption[]) {
    const next = products.map((option) => ({
      option,
      id: createRequestId(),
      operationId: createRequestId(),
    }));
    setInput((current) => ({
      ...current,
      products: [
        ...current.products,
        ...next.map(({ option, id }) => ({
          name: option.product.name,
          icon: option.product.icon,
          id,
          price: moneyInputValue(option.product.priceCents),
        })),
      ],
      stockImports: [
        ...(current.stockImports ?? []),
        ...next.map(({ option, id, operationId }) => ({
          productId: id,
          operationId,
          sourceCategoryId: option.sourceCategoryId,
          sourceProductId: option.sourceProductId,
          sourceStockId: option.sourceStockId,
          context: option.context,
          expectedQuantity: option.quantity,
        })),
      ],
    }));
    setImportLabels((current) => ({
      ...current,
      ...Object.fromEntries(
        next.map(({ id, option }) => [
          id,
          `${option.product.name} — ${option.categoryName}`,
        ]),
      ),
    }));
    setImportOptions(null);
  }
  function close() {
    if (isPending()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (isPending()) return;
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
        size="formCompact"
        open
        title={
          recurring
            ? event
              ? "Editar grupo de produtos"
              : "Novo grupo de produtos"
            : event
              ? "Editar evento"
              : "Novo evento"
        }
        onClose={close}
        footer={
          <>
            <Button variant="neutral" disabled={pending} onClick={close}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={id}
              busy={saving}
              disabled={pending || !cashBoxes.length}
            >
              {recurring ? "Salvar grupo" : "Salvar evento"}
            </Button>
          </>
        }
      >
        <form
          id={id}
          className={recurring ? styles.groupForm : "stack"}
          noValidate
          onSubmit={submit}
        >
          {!cashBoxes.length && <p>Cadastre um caixa antes de continuar.</p>}
          <section
            className={recurring ? styles.groupSection : undefined}
            aria-labelledby={recurring ? `${id}-group-details` : undefined}
          >
            {recurring && <h2 id={`${id}-group-details`}>Dados do grupo</h2>}
            <div className="form-grid">
              <div className="form-full">
                <Field
                  id={`${id}-name`}
                  label={recurring ? "Nome do grupo" : "Nome do evento"}
                  value={input.name}
                  onChange={(e) => change("name", e.target.value)}
                  maxLength={100}
                  required
                  disabled={pending}
                  error={fields?.name}
                />
              </div>
              <div className="form-full">
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
              </div>
              {!recurring && (
                <>
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
                  <SelectField
                    id={`${id}-delivery-enabled`}
                    label="Modalidade"
                    value={
                      input.canteenEnabled
                        ? "canteen"
                        : input.deliveryEnabled
                          ? "yes"
                          : "no"
                    }
                    onValueChange={(v) =>
                      setInput((current) => ({
                        ...current,
                        deliveryEnabled: v === "yes",
                        canteenEnabled: v === "canteen",
                      }))
                    }
                    disabled={pending}
                    options={[
                      { value: "no", label: "Padrão" },
                      { value: "yes", label: "Entregas" },
                      { value: "canteen", label: "Cantina" },
                    ]}
                  />
                </>
              )}
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
          </section>
          <section
            className={recurring ? styles.groupSection : "stack-small"}
            aria-labelledby={`${id}-products`}
          >
            <div className={recurring ? styles.sectionHeading : undefined}>
              <h2 id={`${id}-products`}>Produtos (opcional)</h2>
              {recurring && (
                <p className="muted record-meta" role="status">
                  {input.products.length}{" "}
                  {input.products.length === 1 ? "produto" : "produtos"}
                </p>
              )}
            </div>
            {(input.products.length > 0 || !recurring) && (
              <ul
                className="record-list"
                aria-describedby={
                  groupError ? `${id}-products-error` : undefined
                }
              >
                {input.products.map((p, i) => (
                  <li
                    key={p.id}
                    className={recurring ? styles.productRow : "record-row"}
                  >
                    <div className={styles.product}>
                      <div className={styles.name}>
                        <Field
                          id={`${id}-product-${i}-name`}
                          label={
                            <span className={styles.productLabel}>
                              Nome do produto
                              {recurring &&
                                (sharedProductIds.includes(p.id) ||
                                  input.stockImports?.some(
                                    (ref) => ref.productId === p.id,
                                  )) && (
                                  <SharedStockIndicator
                                    pending={
                                      !!input.stockImports?.some(
                                        (ref) => ref.productId === p.id,
                                      )
                                    }
                                  />
                                )}
                            </span>
                          }
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
                          aria-invalid={!!fields?.[`products.${i}.icon`]}
                          aria-describedby={
                            fields?.[`products.${i}.icon`]
                              ? `${id}-product-${i}-icon-error`
                              : undefined
                          }
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
                      {fields?.[`products.${i}.icon`] && (
                        <div className={styles.productError}>
                          <FieldError
                            id={`${id}-product-${i}-icon-error`}
                            error={fields?.[`products.${i}.icon`]}
                          />
                        </div>
                      )}
                    </div>
                    {importLabels[p.id] && (
                      <p className={styles.origin}>
                        Vínculo ao salvar: {importLabels[p.id]}.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <FieldError id={`${id}-products-error`} error={groupError} />

            <div className={styles.productActions}>
              <Button
                aria-describedby={
                  groupError ? `${id}-products-error` : undefined
                }
                id={`${id}-products-add`}
                type="button"
                variant="neutral"
                disabled={pending || input.products.length >= 100}
                onClick={() =>
                  change("products", [
                    ...input.products,
                    {
                      id: createRequestId(),
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
              {recurring && (
                <Button
                  type="button"
                  variant="neutral"
                  id={`${id}-products-import`}
                  aria-haspopup="dialog"
                  aria-describedby={
                    fields?.stockImports ? `${id}-imports-error` : undefined
                  }
                  busy={sources.pending}
                  disabled={pending || input.products.length >= 100}
                  onClick={() => {
                    if (isPending()) return;
                    sources.execute(
                      () => loadStockImportOptionsAction(event?.id),
                      (options) =>
                        setImportOptions(
                          options.filter(
                            (option) =>
                              !input.stockImports?.some(
                                (ref) =>
                                  ref.sourceStockId === option.sourceStockId,
                              ),
                          ),
                        ),
                    );
                  }}
                >
                  Vincular produtos existentes
                </Button>
              )}
            </div>
            {recurring && (
              <FieldError
                id={`${id}-imports-error`}
                error={fields?.stockImports}
              />
            )}
          </section>
          <span className="sr-only" role="status">
            {saving
              ? recurring
                ? "Salvando grupo"
                : "Salvando evento"
              : sources.pending
                ? "Consultando produtos existentes"
                : removal.pending
                  ? "Verificando produto"
                  : ""}
          </span>
        </form>
      </Modal>
      <ErrorModal
        error={error ?? removal.error ?? sources.error}
        onClose={() => {
          closeError();
          removal.closeError();
          sources.closeError();
        }}
      />
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="As alterações ainda não foram salvas."
          confirmLabel="Descartar"
          onConfirm={onClose}
          onCancel={() => setDiscard(false)}
        />
      )}
      {importOptions && (
        <ExistingProductsPicker
          options={importOptions}
          limit={100 - input.products.length}
          onChoose={bringProducts}
          onClose={() => setImportOptions(null)}
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
