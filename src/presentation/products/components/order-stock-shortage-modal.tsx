"use client";
import { useEffect, useRef, useState } from "react";
import type { ApplicationError } from "@/shared/errors/application-error";
import type { StockShortage } from "@/shared/errors/business-failure";
import { createRequestId } from "@/shared/identifiers/request-id";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { resolveOrderStockShortageAction } from "@/server/products/actions/resolve-order-stock-shortage.action";
import { ErrorModal } from "@/components/modals/error-modal";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

export function OrderStockShortageModal({
  error,
  categoryId,
  orderId,
  onClose,
}: {
  error: ApplicationError;
  categoryId: string;
  orderId: string;
  onClose: () => void;
}) {
  const [shortages, setShortages] = useState(error.stockShortages ?? []);
  const [selected, setSelected] = useState<StockShortage | null>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const notify = useToast();
  useEffect(() => {
    if (selected) cancel.current?.focus();
  }, [selected]);
  // Keep the operation ID after an uncertain response, so retry cannot add twice.
  const [requests] = useState(() => new Map<string, string>());
  const action = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a entrada. Confira o estoque antes de repetir.",
  });
  function confirm() {
    if (!selected || action.isPending()) return;
    const item = selected;
    const key = `${item.productId}:${item.missing}`;
    let requestId = requests.get(key);
    if (!requestId) {
      requestId = createRequestId();
      requests.set(key, requestId);
    }
    const input = {
      requestId,
      entryId: requestId,
      expectedVersion: 0,
      categoryId,
      orderId,
      productId: item.productId,
      quantity: item.missing,
    };
    action.execute(
      () => resolveOrderStockShortageAction(input),
      (remaining) => {
        setSelected(null);
        setShortages(remaining);
        notify("Entrada de estoque registrada.");
        if (!remaining.length) onClose();
      },
    );
  }
  return (
    <>
      <ErrorModal
        error={{ ...error, stockShortages: shortages }}
        onClose={onClose}
        busy={action.pending}
        onAddStock={(item) => setSelected(item)}
      />
      {selected && (
        <Modal
          open
          title="Adicionar ao estoque?"
          onClose={() => {
            if (!action.isPending()) setSelected(null);
          }}
          footer={
            <>
              <Button
                ref={cancel}
                variant="neutral"
                disabled={action.pending}
                onClick={() => setSelected(null)}
              >
                Cancelar
              </Button>
              <Button busy={action.pending} onClick={confirm}>
                Confirmar entrada
              </Button>
            </>
          }
        >
          <p>
            Adicionar {selected.missing.toLocaleString("pt-BR")}{" "}
            {selected.missing === 1 ? "unidade" : "unidades"} de{" "}
            {selected.productName} ao estoque?
          </p>
        </Modal>
      )}
      <ErrorModal error={action.error} onClose={action.closeError} />
    </>
  );
}
