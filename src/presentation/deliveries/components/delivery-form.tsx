"use client";
import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modals/modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import type { InputValidation } from "@/shared/validation/input";
import type {
  ApplicationError,
  Result,
} from "@/shared/errors/application-error";
export function DeliveryForm({
  title,
  dirty,
  input,
  validate,
  fieldIds,
  save,
  onClose,
  onSaved,
  children,
}: {
  title: string;
  dirty: boolean;
  input: unknown;
  validate: (input: unknown) => InputValidation<unknown>;
  fieldIds: Record<string, string>;
  save: () => Promise<Result<unknown>>;
  onClose: () => void;
  onSaved?: () => void;
  children: (fields: ApplicationError["fields"], pending: boolean) => ReactNode;
}) {
  const [discard, setDiscard] = useState(false),
    id = useId(),
    router = useRouter(),
    toast = useToast();
  useUnsavedChanges(dirty);
  const { execute, pending, error, closeError, fields, isPending } =
    useServerAction({
      connectionMessage:
        "Não foi possível confirmar a gravação. Confira os dados antes de repetir.",
      fieldIds,
      validationKey: JSON.stringify(input),
      validate: () => {
        const r = validate(input);
        return r.ok ? null : presentBusinessFailure(r.error);
      },
    });
  function close() {
    if (isPending()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  return (
    <>
      <Modal
        open
        title={title}
        size="formCompact"
        onClose={close}
        footer={
          <>
            <Button variant="neutral" disabled={pending} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form={id} busy={pending}>
              Salvar
            </Button>
          </>
        }
      >
        <form
          id={id}
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            execute(save, () => {
              toast("Dados salvos.");
              onSaved?.();
              onClose();
              router.refresh();
            });
          }}
        >
          {children(fields, pending)}
        </form>
      </Modal>
      <ErrorModal error={error} onClose={closeError} />
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="As alterações não salvas serão perdidas."
          confirmLabel="Descartar"
          onCancel={() => setDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </>
  );
}
