"use client";
import { useId, useState, type FormEvent } from "react";
import type { MovementListEntry as Movement } from "./movement-list";
import { validateMovement } from "@/server/movements/inputs/movement.input";
import { createMovementAction } from "@/server/movements/actions/create-movement.action";
import { updateMovementAction } from "@/server/movements/actions/update-movement.action";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { moneyInputValue } from "@/shared/validation/money-input";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { Modal } from "@/components/modals/modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { MoneyField } from "@/components/ui/money-field";
import { DateField } from "@/components/ui/date-field";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { ReceiptLink } from "@/components/ui/receipt-link";
import {
  RECEIPT_MAX_FILES,
  RECEIPT_MAX_BYTES,
  RECEIPT_TYPES,
  receiptMetadata,
} from "@/shared/receipts/receipt-input";
import { TextareaField } from "@/components/ui/textarea-field";
export function MovementFormModal({
  movement,
  cashBoxes,
  today,
  onClose,
  onSaved,
}: {
  movement?: Movement;
  cashBoxes: { id: string; name: string }[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [requestId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState({
    cashBoxId: movement?.cashBoxId ?? "",
    direction: movement?.direction ?? "incoming",
    amount: movement ? moneyInputValue(movement.amountCents) : "",
    occurredOn: movement?.occurredOn ?? today,
    reason: movement?.reason ?? "",
  });
  const [retainedReceipts, setRetainedReceipts] = useState(
    movement?.receipts ?? [],
  );
  const [files, setFiles] = useState<File[]>([]);
  const [receiptRevision, setReceiptRevision] = useState(0);
  const normalized = {
    ...input,
    receipts: [
      ...retainedReceipts.map(({ size, type }) => ({ size, type })),
      ...files.map(receiptMetadata),
    ],
    retainedReceiptIds: retainedReceipts.map((receipt) => receipt.id),
  };
  const state = JSON.stringify(normalized);
  const [baseline] = useState(state);
  const dirty = state !== baseline || files.length > 0;
  const [discard, setDiscard] = useState(false);
  useUnsavedChanges(dirty);
  const { execute, pending, isPending, error, fields, closeError } =
    useServerAction({
      validationKey: `${state}:${receiptRevision}`,
      validate: () => {
        const result = validateMovement(normalized);
        return result.ok ? null : presentBusinessFailure(result.error);
      },
      fieldIds: {
        cashBoxId: `${id}-box`,
        occurredOn: `${id}-date`,
        direction: `${id}-direction`,
        amount: `${id}-amount`,
        reason: `${id}-reason`,
        receipts: `${id}-receipts`,
        retainedReceiptIds: `${id}-receipts`,
      },
      connectionMessage:
        "Não foi possível confirmar a operação. Confira as movimentações antes de tentar novamente.",
    });
  const change = (key: keyof typeof input, value: string) =>
    setInput((current) => ({ ...current, [key]: value }));
  function close() {
    if (isPending()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending()) return;
    const form = new FormData();
    for (const [key, value] of Object.entries(input)) form.set(key, value);
    form.set("requestId", requestId);
    for (const receipt of retainedReceipts)
      form.append("retainedReceiptIds", receipt.id);
    for (const file of files) form.append("receipts", file);
    if (movement) {
      form.set("id", movement.id);
      form.set("version", String(movement.version));
    }
    execute(
      () =>
        movement ? updateMovementAction(form) : createMovementAction(form),
      onSaved,
    );
  }
  return (
    <>
      <Modal
        open
        size="form"
        title={movement ? "Editar movimentação" : "Nova movimentação"}
        onClose={close}
        footer={
          <>
            <Button variant="neutral" onClick={close} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={id}
              busy={pending}
              disabled={!cashBoxes.length}
            >
              Salvar movimentação
            </Button>
          </>
        }
      >
        {!cashBoxes.length ? (
          <p>Cadastre um caixa antes de registrar uma movimentação.</p>
        ) : (
          <form id={id} className="form-grid" noValidate onSubmit={submit}>
            <SelectField
              id={`${id}-box`}
              label="Caixa"
              value={input.cashBoxId}
              onValueChange={(v) => change("cashBoxId", v)}
              disabled={pending}
              error={fields?.cashBoxId}
              options={[
                { value: "", label: "Selecione um caixa" },
                ...cashBoxes.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
            <DateField
              id={`${id}-date`}
              name="occurredOn"
              label="Data da movimentação"
              value={input.occurredOn}
              onValueChange={(v) => change("occurredOn", v)}
              required
              disabled={pending}
              error={fields?.occurredOn}
            />
            <SelectField
              id={`${id}-direction`}
              label="Tipo"
              value={input.direction}
              onValueChange={(v) => change("direction", v)}
              disabled={pending}
              error={fields?.direction}
              options={[
                { value: "incoming", label: "Entrada" },
                { value: "outgoing", label: "Saída" },
              ]}
            />
            <MoneyField
              id={`${id}-amount`}
              label="Valor (R$)"
              value={input.amount}
              onValueChange={(v) => change("amount", v)}
              required
              disabled={pending}
              error={fields?.amount}
            />
            <div className="form-full">
              <TextareaField
                id={`${id}-reason`}
                label="Justificativa"
                value={input.reason}
                onChange={(e) => change("reason", e.target.value)}
                maxLength={500}
                required
                disabled={pending}
                error={fields?.reason}
              />
            </div>
            <div className="form-full stack-small">
              <FileUploadField
                id={`${id}-receipts`}
                label="Comprovantes (opcional)"
                files={files}
                maxFiles={RECEIPT_MAX_FILES}
                maxBytes={RECEIPT_MAX_BYTES}
                accept={RECEIPT_TYPES.join(",")}
                hint="Até 5 arquivos JPEG, PNG, WebP ou PDF, de até 5 MB cada."
                existingFiles={retainedReceipts.map((receipt, index) => ({
                  id: receipt.id,
                  name: `comprovante ${index + 1}`,
                  size: receipt.size,
                  label: (
                    <ReceiptLink
                      src={`/movimentacoes/${movement!.id}/comprovante?receiptId=${encodeURIComponent(receipt.id)}`}
                      name="movimentação"
                      type={receipt.type}
                      label={`${receipt.type === "application/pdf" ? "Baixar" : "Ver"} comprovante ${index + 1}`}
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
          </form>
        )}
      </Modal>
      <ErrorModal error={error} onClose={closeError} />
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="A movimentação ainda não foi salva."
          confirmLabel="Descartar"
          onCancel={() => setDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </>
  );
}
