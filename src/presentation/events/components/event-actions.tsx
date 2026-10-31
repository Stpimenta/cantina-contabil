"use client";
import { deleteEventAction } from "@/server/events/actions/delete-event.action";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
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
  cashBoxes,
  today,
}: {
  event?: Event;
  cashBoxes: { id: string; name: string }[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { execute, pending, isPending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a exclusão. Confira os eventos antes de tentar novamente.",
  });
  const router = useRouter();
  const notify = useToast();
  return (
    <>
      <Button
        variant={event ? "neutral" : "primary"}
        iconBreakpoint={event ? "tablet" : "mobile"}
        mobileIcon={<Icon name={event ? "edit" : "plus"} />}
        aria-label={event ? "Editar evento" : "Novo evento"}
        title={event ? "Editar evento" : "Novo evento"}
        onClick={() => setOpen(true)}
      >
        {event ? "Editar evento" : "Novo evento"}
      </Button>
      {event && (
        <Button
          variant="danger"
          disabled={pending}
          iconBreakpoint="tablet"
          mobileIcon={<Icon name="trash" />}
          aria-label="Excluir evento"
          title="Excluir evento"
          onClick={() => setConfirmDelete(true)}
        >
          <Icon name="trash" />
          Excluir evento
        </Button>
      )}
      {event && confirmDelete && (
        <ConfirmationModal
          title="Excluir evento?"
          message={`Excluir o evento “${event.name}”? O histórico será preservado. Eventos com pedidos não podem ser excluídos.`}
          confirmLabel="Excluir evento"
          busy={pending}
          onCancel={() => {
            if (!isPending()) setConfirmDelete(false);
          }}
          onConfirm={() =>
            execute(
              () => deleteEventAction(event.id, event.version),
              () => {
                setConfirmDelete(false);
                notify("Evento excluído.");
                router.push("/eventos");
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
          cashBoxes={cashBoxes}
          today={today}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            notify(event ? "Evento atualizado." : "Evento criado.");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
