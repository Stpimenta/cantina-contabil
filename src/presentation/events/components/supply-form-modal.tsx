"use client";
import { useId, useState, type FormEvent } from "react";
import { SupplyReceipt } from "./supply-receipt";
import { updateSupplyAction } from "@/server/events/actions/update-supply.action";
import type { SupplyListEntry } from "./supply-list";
import { moneyInputValue } from "@/shared/validation/money-input";
import { createSupplyAction } from "@/server/events/actions/create-supply.action";
import {
  validateCreateSupply,
  validateUpdateSupply,
  receiptMetadata,
  RECEIPT_MAX_FILES,
  RECEIPT_MAX_BYTES,
} from "@/server/events/inputs/create-supply.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { Modal } from "@/components/modals/modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { TextareaField } from "@/components/ui/textarea-field";
import { Field } from "@/components/ui/field";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { ProductIconModal } from "@/components/modals/product-icon-modal";
import { ProductIcon } from "@/components/ui/product-icon";
import { FieldError } from "@/components/ui/field-error";
import {
  productIconLabel,
  type ProductIconId,
} from "@/shared/products/product-icons";
import { Button } from "@/components/ui/button";
import styles from "./supply-form-modal.module.css";
export function SupplyFormModal({
  eventId,
  cashBoxes,
  supply,
  onClose,
  onSaved,
}: {
  eventId: string;
  supply?: SupplyListEntry;
  cashBoxes: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [requestId] = useState(() => supply?.id ?? crypto.randomUUID());
  const [icon, setIcon] = useState<ProductIconId>(supply?.icon ?? "bag");
  const [iconOpen, setIconOpen] = useState(false);
  const [name, setName] = useState(supply?.name ?? "");
  const [donorName, setDonorName] = useState(supply?.donorName ?? "");
  const [description, setDescription] = useState(supply?.description ?? "");
  const [amount, setAmount] = useState(
    supply ? moneyInputValue(supply.amountCents) : "",
  );
  const [source, setSource] = useState(supply?.source ?? "purchase");
  const [cashBoxId, setCashBoxId] = useState(supply?.cashBoxId ?? "");
  const [received, setReceived] = useState(supply?.received ?? false);
  const [retainedReceipts, setRetainedReceipts] = useState(
    supply?.receipts ?? [],
  );
  const [files, setFiles] = useState<File[]>([]);
  const [receiptRevision, setReceiptRevision] = useState(0);
  const [discard, setDiscard] = useState(false);
  const input = {
    requestId,
    name,
    description,
    donorName: source === "donation" ? donorName : "",
    icon,
    amount,
    source,
    cashBoxId: source === "purchase" ? cashBoxId : null,
    received: source === "purchase" ? true : received,
    receipts: [
      ...retainedReceipts.map(({ size, type }) => ({ size, type })),
      ...files.map(receiptMetadata),
    ],
    version: supply?.version,
    retainedReceiptIds: retainedReceipts.map((receipt) => receipt.id),
  };
  const state = JSON.stringify(input);
  const [baseline] = useState(state);
  const dirty = state !== baseline;
  useUnsavedChanges(dirty);
  const { execute, pending, isPending, error, fields, closeError } =
    useServerAction({
      connectionMessage:
        "Não foi possível confirmar a gravação. Confira os insumos antes de repetir.",
      validationKey: `${state}:${receiptRevision}`,
      validate: () => {
        const result = supply
          ? validateUpdateSupply(input)
          : validateCreateSupply(input);
        return result.ok ? null : presentBusinessFailure(result.error);
      },
      fieldIds: {
        name: `${id}-name`,
        source: `${id}-source`,
        cashBoxId: `${id}-source`,
        amount: `${id}-amount`,
        icon: `${id}-icon`,
        received: `${id}-received`,
        donorName: `${id}-donor-name`,
        description: `${id}-description`,
        receipts: `${id}-receipt`,
        retainedReceiptIds: `${id}-receipt`,
      },
    });
  function close() {
    if (isPending()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const data = new FormData();
    data.set("requestId", requestId);
    data.set("name", name);
    data.set("description", description);
    data.set("donorName", input.donorName);
    data.set("icon", icon);
    data.set("amount", amount);
    data.set("source", source);
    data.set("cashBoxId", input.cashBoxId ?? "");
    data.set("received", String(input.received));
    data.set("version", String(supply?.version ?? ""));
    for (const receipt of retainedReceipts)
      data.append("retainedReceiptIds", receipt.id);
    for (const file of files) data.append("receipts", file);
    execute(
      () =>
        supply
          ? updateSupplyAction(eventId, supply.id, data)
          : createSupplyAction(eventId, data),
      onSaved,
    );
  }
  return (
    <>
      <Modal
        open
        size="formCompact"
        title={supply ? "Editar insumo" : "Novo insumo"}
        onClose={close}
        footer={
          <>
            <Button variant="neutral" disabled={pending} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form={id} busy={pending}>
              Salvar insumo
            </Button>
          </>
        }
      >
        <form
          id={id}
          className={`form-grid ${styles.fields}`}
          noValidate
          onSubmit={submit}
        >
          <div className="form-full">
            <Field
              id={`${id}-name`}
              label="Nome do insumo"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
              disabled={pending}
              error={fields?.name}
            />
          </div>
          <div className={styles.origin}>
            <SelectField
              id={`${id}-source`}
              label="Origem"
              value={source === "donation" ? "donation" : cashBoxId}
              onValueChange={(value) => {
                setSource(value === "donation" ? "donation" : "purchase");
                setCashBoxId(value === "donation" ? "" : value);
              }}
              options={[
                { value: "", label: "Selecione a origem" },
                { value: "donation", label: "Doação" },
                ...cashBoxes.map((box) => ({ value: box.id, label: box.name })),
              ]}
              disabled={pending}
              required
              error={fields?.source ?? fields?.cashBoxId}
            />
          </div>
          <div className={styles.amount}>
            <MoneyField
              id={`${id}-amount`}
              label={
                source === "purchase"
                  ? "Valor da compra (R$)"
                  : "Valor de referência (R$)"
              }
              value={amount}
              onValueChange={setAmount}
              required
              disabled={pending}
              error={fields?.amount}
            />
          </div>
          <div className={`stack-small ${styles.icon}`}>
            <p className="record-meta">Ícone</p>
            <div>
              <Button
                id={`${id}-icon`}
                mobileIcon={<ProductIcon name={icon} />}
                type="button"
                variant="neutral"
                disabled={pending}
                aria-haspopup="dialog"
                aria-label={`Escolher ícone do insumo: ${productIconLabel(icon)}`}
                aria-describedby={fields?.icon ? `${id}-icon-error` : undefined}
                onClick={() => setIconOpen(true)}
              >
                <ProductIcon name={icon} />
                {productIconLabel(icon)}
              </Button>
            </div>
            <FieldError id={`${id}-icon-error`} error={fields?.icon} />
          </div>
          {source === "donation" && (
            <div className={styles.received}>
              <SelectField
                id={`${id}-received`}
                label="Recebimento da doação"
                value={received ? "received" : "pending"}
                onValueChange={(value) => setReceived(value === "received")}
                options={[
                  { value: "pending", label: "Pendente" },
                  { value: "received", label: "Recebido" },
                ]}
                disabled={pending}
                error={fields?.received}
              />
            </div>
          )}
          {source === "donation" && (
            <div className="form-full">
              <Field
                id={`${id}-donor-name`}
                label="Nome de quem doou (opcional)"
                value={donorName}
                onChange={(event) => setDonorName(event.target.value)}
                maxLength={100}
                disabled={pending}
                error={fields?.donorName}
              />
            </div>
          )}
          <div className="form-full">
            <TextareaField
              id={`${id}-description`}
              label="Descrição (opcional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              disabled={pending}
              error={fields?.description}
            />
          </div>
          <div className="form-full stack-small">
            <FileUploadField
              id={`${id}-receipt`}
              label={
                source === "purchase"
                  ? "Comprovantes (ao menos um obrigatório)"
                  : "Comprovantes (opcional)"
              }
              files={files}
              maxFiles={RECEIPT_MAX_FILES}
              maxBytes={RECEIPT_MAX_BYTES}
              hint="Até 5 arquivos JPEG, PNG, WebP ou PDF, de até 5 MB cada."
              existingFiles={retainedReceipts.map((receipt, index) => ({
                id: receipt.id,
                name: `comprovante ${index + 1}`,
                size: receipt.size,
                label: (
                  <SupplyReceipt
                    eventId={eventId}
                    supplyId={requestId}
                    name={name}
                    type={receipt.type}
                    receiptId={receipt.id}
                    label={`Comprovante ${index + 1}`}
                    disabled={pending}
                  />
                ),
              }))}
              onRemoveExisting={(receiptId) => {
                setRetainedReceipts((current) =>
                  current.filter((receipt) => receipt.id !== receiptId),
                );
                setReceiptRevision((current) => current + 1);
              }}
              onValueChange={(value) => {
                setFiles(value);
                setReceiptRevision((current) => current + 1);
              }}
              disabled={pending}
              error={fields?.receipts ?? fields?.retainedReceiptIds}
            />
          </div>
          <span className="sr-only" role="status">
            {pending ? "Salvando insumo" : ""}
          </span>
        </form>
      </Modal>
      {iconOpen && (
        <ProductIconModal
          title="Ícone do insumo"
          value={icon}
          onChoose={(value) => {
            setIcon(value);
            setIconOpen(false);
          }}
          onClose={() => setIconOpen(false)}
        />
      )}
      <ErrorModal error={error} onClose={closeError} />
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="O insumo ainda não foi salvo."
          confirmLabel="Descartar"
          onConfirm={onClose}
          onCancel={() => setDiscard(false)}
        />
      )}
    </>
  );
}
