"use client";
import { validateSaveCashBox } from "@/server/cash-boxes/inputs/save-cash-box.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { useId, useState, type FormEvent } from "react";
import type { CashBox } from "@/server/cash-boxes/models/cash-box.model";
import { createCashBoxAction } from "@/server/cash-boxes/actions/create-cash-box.action";
import { updateCashBoxAction } from "@/server/cash-boxes/actions/update-cash-box.action";
import { useServerAction } from "@/shared/hooks/use-server-action";
import {
  CASH_BOX_NAME_MAX,
  CASH_BOX_DESCRIPTION_MAX,
} from "@/server/cash-boxes/models/cash-box-rules";
import { Modal } from "./modal";
import { ErrorModal } from "./error-modal";
import { ConfirmationModal } from "./confirmation-modal";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { TextareaField } from "../ui/textarea-field";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";

export function CashBoxFormModal({
  box,
  onClose,
  onSaved,
}: {
  box?: CashBox;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(box?.name ?? "");
  const [description, setDescription] = useState(box?.description ?? "");
  const [discard, setDiscard] = useState(false);
  const { execute, pending, isPending, error, fields, closeError } =
    useServerAction({
      validationKey: JSON.stringify({ name, description }),
      validate: () => {
        const result = validateSaveCashBox({ name, description });
        return result.ok ? null : presentBusinessFailure(result.error);
      },
      connectionMessage:
        "Não foi possível confirmar a operação. Confira sua conexão e atualize os dados antes de tentar novamente.",
      fieldIds: { name: `${id}-name`, description: `${id}-description` },
    });
  const dirty =
    name !== (box?.name ?? "") || description !== (box?.description ?? "");
  useUnsavedChanges(dirty);
  function close() {
    if (isPending()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    execute(
      () =>
        box
          ? updateCashBoxAction(box.id, box.version, data)
          : createCashBoxAction(data),
      onSaved,
    );
  }

  return (
    <>
      <Modal
        size="form"
        open
        title={box ? "Editar caixa" : "Novo caixa"}
        onClose={close}
        footer={
          <>
            <Button variant="neutral" onClick={close} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" form={id} busy={pending}>
              {pending ? "Salvando…" : "Salvar caixa"}
            </Button>
          </>
        }
      >
        <form id={id} className="stack" noValidate onSubmit={submit}>
          <Field
            id={`${id}-name`}
            name="name"
            label="Nome do caixa"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={CASH_BOX_NAME_MAX}
            required
            disabled={pending}
            error={fields?.name}
          />
          <TextareaField
            id={`${id}-description`}
            name="description"
            label="Descrição (opcional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={CASH_BOX_DESCRIPTION_MAX}
            disabled={pending}
            error={fields?.description}
          />
          <span className="sr-only" role="status">
            {pending ? "Salvando caixa" : ""}
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
