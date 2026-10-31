"use client";
import type { Donation } from "@/server/donations/models/donation.model";
import { moneyInputValue } from "@/shared/validation/money-input";
import { updateDonationAction } from "@/server/donations/actions/update-donation.action";
import { validateDonation } from "@/server/donations/inputs/create-donation.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { useId, useState, type FormEvent } from "react";
import { createDonationAction } from "@/server/donations/actions/create-donation.action";
import {
  DONOR_NAME_MAX,
  DONATION_NOTE_MAX,
} from "@/server/donations/models/donation-rules";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { Modal } from "./modal";
import { ErrorModal } from "./error-modal";
import { ConfirmationModal } from "./confirmation-modal";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { MoneyField } from "../ui/money-field";
import { DateField } from "../ui/date-field";
import { SelectField } from "../ui/select-field";
import { TextareaField } from "../ui/textarea-field";
export function DonationFormModal({
  donation,
  cashBoxes,
  today,
  onClose,
  onSaved,
}: {
  donation?: Donation;
  cashBoxes: { id: string; name: string }[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [requestId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState({
    cashBoxId: donation?.cashBoxId ?? "",
    amount: donation ? moneyInputValue(donation.amountCents) : "",
    donatedOn: donation?.donatedOn ?? today,
    donorName: donation?.donorName ?? "",
    note: donation?.note ?? "",
  });
  const [discard, setDiscard] = useState(false);
  const { execute, pending, isPending, error, fields, closeError } =
    useServerAction({
      validationKey: JSON.stringify(input),
      validate: () => {
        const result = validateDonation(input);
        return result.ok ? null : presentBusinessFailure(result.error);
      },
      connectionMessage:
        "Não foi possível confirmar o registro. Confira a lista de doações antes de tentar novamente.",
      fieldIds: {
        cashBoxId: `${id}-cashBoxId`,
        amount: `${id}-amount`,
        donatedOn: `${id}-donatedOn`,
        donorName: `${id}-donorName`,
        note: `${id}-note`,
      },
    });
  const [baseline] = useState(JSON.stringify(input));
  const dirty = JSON.stringify(input) !== baseline;
  useUnsavedChanges(dirty);
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
    const form = new FormData(event.currentTarget);
    if (donation) {
      form.set("id", donation.id);
      form.set("version", String(donation.version));
    }
    execute(
      () =>
        donation ? updateDonationAction(form) : createDonationAction(form),
      onSaved,
    );
  }

  return (
    <>
      <Modal
        size="form"
        open
        title={donation ? "Editar doação" : "Nova doação"}
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
              {pending
                ? "Salvando…"
                : donation
                  ? "Salvar doação"
                  : "Registrar doação"}
            </Button>
          </>
        }
      >
        {!cashBoxes.length ? (
          <p>Cadastre um caixa antes de registrar uma doação.</p>
        ) : (
          <form id={id} className="form-grid" noValidate onSubmit={submit}>
            <input type="hidden" name="requestId" value={requestId} />
            <SelectField
              id={`${id}-cashBoxId`}
              name="cashBoxId"
              label="Caixa de destino"
              value={input.cashBoxId}
              onValueChange={(value) => change("cashBoxId", value)}
              required
              disabled={pending}
              error={fields?.cashBoxId}
              options={[
                { value: "", label: "Selecione um caixa" },
                ...cashBoxes.map((box) => ({ value: box.id, label: box.name })),
              ]}
            />
            <MoneyField
              id={`${id}-amount`}
              name="amount"
              label="Valor (R$)"
              value={input.amount}
              onValueChange={(value) => change("amount", value)}
              required
              disabled={pending}
              error={fields?.amount}
            />
            <DateField
              id={`${id}-donatedOn`}
              name="donatedOn"
              label="Data da doação"
              value={input.donatedOn}
              onValueChange={(value) => change("donatedOn", value)}
              required
              disabled={pending}
              error={fields?.donatedOn}
            />
            <Field
              id={`${id}-donorName`}
              name="donorName"
              label="Nome do doador (opcional)"
              value={input.donorName}
              onChange={(event) => change("donorName", event.target.value)}
              maxLength={DONOR_NAME_MAX}
              disabled={pending}
              error={fields?.donorName}
            />
            <div className="form-full">
              <TextareaField
                id={`${id}-note`}
                name="note"
                label="Observação (opcional)"
                value={input.note}
                onChange={(event) => change("note", event.target.value)}
                maxLength={DONATION_NOTE_MAX}
                disabled={pending}
                error={fields?.note}
              />
            </div>
            <span className="sr-only" role="status">
              {pending ? "Registrando doação" : ""}
            </span>
          </form>
        )}
      </Modal>
      <ErrorModal error={error} onClose={closeError} />
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="As alterações da doação ainda não foram salvas."
          confirmLabel="Descartar"
          onConfirm={onClose}
          onCancel={() => setDiscard(false)}
        />
      )}
    </>
  );
}
