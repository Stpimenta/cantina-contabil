"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CashBox } from "@/server/cash-boxes/models/cash-box.model";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { deleteCashBoxAction } from "@/server/cash-boxes/actions/delete-cash-box.action";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CashBoxFormModal } from "@/components/modals/cash-box-form-modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { useToast } from "@/components/ui/toast-provider";

export function CashBoxActions({ box }: { box?: CashBox }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const notify = useToast();
  const { execute, pending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a exclusão. Confira sua conexão e atualize a lista.",
  });
  const router = useRouter();
  function remove() {
    if (!box) return;
    execute(
      () => deleteCashBoxAction(box.id, box.version),
      () => {
        setDeleting(false);
        notify("Caixa excluído.");
        router.replace("/caixas");
        router.refresh();
      },
    );
  }

  return (
    <>
      <div className="action-group">
        <Button
          variant={box ? "neutral" : "primary"}
          mobileIcon={<Icon name={box ? "edit" : "plus"} />}
          iconBreakpoint={box ? "tablet" : "mobile"}
          aria-label={box ? "Editar caixa" : "Novo caixa"}
          title={box ? "Editar caixa" : "Novo caixa"}
          onClick={() => {
            setEditing(true);
          }}
        >
          {box ? "Editar caixa" : "Novo caixa"}
        </Button>
        {box && (
          <Button
            variant="danger"
            mobileIcon={<Icon name="trash" />}
            iconBreakpoint="tablet"
            aria-label="Excluir caixa"
            title="Excluir caixa"
            onClick={() => setDeleting(true)}
          >
            <Icon name="trash" />
            Excluir caixa
          </Button>
        )}
      </div>
      {editing && (
        <CashBoxFormModal
          key={box?.version ?? "new"}
          box={box}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            notify(box ? "Alterações salvas." : "Caixa criado.");
            router.refresh();
          }}
        />
      )}
      {deleting && box && (
        <ConfirmationModal
          title="Excluir caixa?"
          message={`O caixa “${box.name}” deixará de aparecer na lista. Seus dados e histórico serão preservados.`}
          confirmLabel="Excluir caixa"
          busy={pending}
          onConfirm={remove}
          onCancel={() => setDeleting(false)}
        />
      )}
      <ErrorModal
        error={error}
        onClose={() => {
          setDeleting(false);
          closeError();
        }}
      />
    </>
  );
}
