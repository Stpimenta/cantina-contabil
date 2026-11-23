"use client";
import { useCashBoxAccess } from "@/components/ui/cash-box-access";
import { deleteEventAction } from "@/server/events/actions/delete-event.action";
import { useServerAction } from "@/shared/hooks/use-server-action";
import {
  ConfirmationModal,
  deletionConfirmationMessage,
} from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Event } from "@/server/events/models/event.model";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast-provider";
import { EventFormModal } from "./event-form-modal";
export function EventActions({
  event,
  sharedProductIds,
  recurring = event?.kind === "product_category",
  cashBoxes,
  today,
}: {
  event?: Event;
  sharedProductIds?: string[];
  recurring?: boolean;
  cashBoxes: { id: string; name: string }[];
  today: string;
}) {
  const editLabel = recurring ? "Editar grupo" : "Editar evento";
  const newLabel = recurring ? "Novo grupo" : "Novo evento";
  const deleteLabel = recurring ? "Excluir grupo" : "Excluir evento";
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { execute, pending, isPending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a exclusão. Confira os registros antes de tentar novamente.",
  });
  const router = useRouter();
  const notify = useToast();
  const { canWrite, canWriteEvent } = useCashBoxAccess();
  cashBoxes = cashBoxes.filter((box) =>
    event ? box.id === event.cashBoxId : canWrite(box.id),
  );
  if (event ? !canWriteEvent(event) : cashBoxes.length === 0) return null;
  return (
    <>
      <Button
        variant={event ? "neutral" : "primary"}
        iconBreakpoint={event ? "tablet" : "mobile"}
        mobileIcon={<Icon name={event ? "edit" : "plus"} />}
        aria-label={event ? editLabel : newLabel}
        title={event ? editLabel : newLabel}
        onClick={() => setOpen(true)}
      >
        {event ? editLabel : newLabel}
      </Button>
      {event && (
        <Button
          variant="danger"
          disabled={pending}
          iconBreakpoint="tablet"
          mobileIcon={<Icon name="trash" />}
          aria-label={deleteLabel}
          title={deleteLabel}
          onClick={() => setConfirmDelete(true)}
        >
          <Icon name="trash" />
          {deleteLabel}
        </Button>
      )}
      {event && confirmDelete && (
        <ConfirmationModal
          title={`${deleteLabel}?`}
          message={deletionConfirmationMessage}
          confirmLabel={deleteLabel}
          busy={pending}
          onCancel={() => {
            if (!isPending()) setConfirmDelete(false);
          }}
          onConfirm={() =>
            execute(
              () => deleteEventAction(event.id, event.version),
              () => {
                setConfirmDelete(false);
                notify(recurring ? "Grupo excluído." : "Evento excluído.");
                router.push(recurring ? "/products" : "/events");
                router.refresh();
              },
            )
          }
        />
      )}
      <ErrorModal error={error} onClose={closeError} />
      {open && (
        <EventFormModal
          event={event}
          sharedProductIds={sharedProductIds}
          recurring={recurring}
          cashBoxes={cashBoxes}
          today={today}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            notify(
              recurring
                ? event
                  ? "Grupo atualizado."
                  : "Grupo criado."
                : event
                  ? "Evento atualizado."
                  : "Evento criado.",
            );
            router.refresh();
          }}
        />
      )}
    </>
  );
}
