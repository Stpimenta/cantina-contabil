"use client";
import { useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { StockHistory } from "./stock-history";
import styles from "./shared-stock-indicator.module.css";
import type { SharedStockHistory } from "@/server/products/models/shared-stock.model";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/modals/modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { useToast } from "@/components/ui/toast-provider";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { createRequestId } from "@/shared/identifiers/request-id";
import {
  stockContext,
  type StockMember,
} from "@/server/products/models/shared-stock.model";
import { validateSharedStock } from "@/server/products/inputs/shared-stock.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import {
  loadStockHistoryAction,
  loadSharedStockAction,
  manageSharedStockAction,
} from "@/server/products/actions/shared-stock.action";
interface Loaded {
  members: StockMember[];
  writable: boolean;
  history: { items: SharedStockHistory[]; hasMore: boolean };
}
export function StockLinksControl({
  categoryId,
  productId,
  disabled = false,
  onSaved,
}: {
  categoryId: string;
  productId: string;
  disabled?: boolean;
  onSaved?: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const load = useServerAction({
    connectionMessage:
      "Não foi possível consultar os vínculos. Tente novamente.",
  });
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        iconOnly
        className={styles.trigger}
        aria-label="Ver detalhes e histórico do estoque compartilhado"
        title="Estoque compartilhado"
        disabled={disabled}
        busy={load.pending}
        aria-haspopup="dialog"
        onClick={() => {
          if (load.isPending()) return;
          load.execute(
            async () => {
              const [details, history] = await Promise.all([
                loadSharedStockAction(categoryId, productId),
                loadStockHistoryAction(categoryId, productId, 1),
              ]);
              if (!details.ok) return details;
              if (!history.ok) return history;
              return {
                ok: true as const,
                value: { ...details.value, history: history.value },
              };
            },
            (result) => {
              if (!disabledRef.current) setLoaded(result);
            },
          );
        }}
      >
        <Icon name="stockLink" />
      </Button>
      {loaded && (
        <StockLinksDialog
          categoryId={categoryId}
          productId={productId}
          data={loaded}
          onClose={() => setLoaded(null)}
          onSaved={() => {
            setLoaded(null);
            onSaved?.();
          }}
        />
      )}
      <ErrorModal error={load.error} onClose={load.closeError} />
    </>
  );
}
function StockLinksDialog({
  categoryId,
  productId,
  data,
  onClose,
  onSaved,
}: {
  categoryId: string;
  productId: string;
  data: Loaded;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId(),
    router = useRouter(),
    notify = useToast();
  const [requestId] = useState(createRequestId),
    [separating, setSeparating] = useState(false),
    [quantity, setQuantity] = useState("0"),
    [discard, setDiscard] = useState(false);
  const balance = data.members[0]?.quantity ?? 0;
  const input = {
    requestId,
    categoryId,
    productId,
    action: "unlink" as const,
    quantity: /^\d+$/.test(quantity) ? Number(quantity) : NaN,
    context: stockContext(data.members),
    expectedQuantity: balance,
    targetQuantity: 0,
  };
  const save = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a desvinculação. Confira o estoque antes de repetir.",
    validationKey: JSON.stringify({ input, quantity }),
    fieldIds: { quantity: `${id}-quantity` },
    validate: () => {
      const result = validateSharedStock(input);
      if (!result.ok) return presentBusinessFailure(result.error);
      if (input.quantity > balance)
        return presentBusinessFailure({
          code: "INVALID_STOCK_INPUT",
          category: "validation",
          issues: { quantity: "INVALID_AMOUNT" },
        });
      return null;
    },
  });
  useUnsavedChanges(separating);
  function close() {
    if (save.isPending()) return;
    if (separating) setDiscard(true);
    else onClose();
  }
  return (
    <>
      <Modal
        open
        size="formCompact"
        title="Estoque compartilhado"
        onClose={close}
        footer={
          <>
            <Button variant="neutral" disabled={save.pending} onClick={close}>
              Fechar
            </Button>
            {data.writable && data.members.length > 1 && (
              <Button
                busy={save.pending}
                onClick={() => {
                  if (save.isPending()) return;
                  if (!separating) {
                    setSeparating(true);
                    requestAnimationFrame(() =>
                      document
                        .getElementById(`${id}-quantity`)
                        ?.focus({ preventScroll: true }),
                    );
                    return;
                  }
                  save.execute(
                    () => manageSharedStockAction(input),
                    () => {
                      notify("Produto desvinculado.");
                      onSaved();
                      router.refresh();
                    },
                  );
                }}
              >
                {separating ? "Confirmar desvinculação" : "Desvincular produto"}
              </Button>
            )}
          </>
        }
      >
        <div className="stack">
          <p>
            {data.members.length > 1
              ? "Estoque compartilhado"
              : "Estoque próprio"}
            : <strong>{balance.toLocaleString("pt-BR")} unidades</strong>.
          </p>
          <ul className="record-list">
            {data.members.map((m) => (
              <li className="record-row" key={`${m.eventId}:${m.productId}`}>
                <div>
                  <p className="record-title">{m.productName}</p>
                  <p className="muted record-meta">{m.categoryName}</p>
                </div>
              </li>
            ))}
          </ul>
          <section className="stack-small" aria-labelledby={`${id}-history`}>
            <h2 id={`${id}-history`}>Histórico</h2>
            <StockHistory
              categoryId={categoryId}
              productId={productId}
              initial={data.history}
            />
          </section>
          {separating && (
            <>
              <Field
                id={`${id}-quantity`}
                label={`Unidades para ${data.members.find((m) => m.eventId === categoryId && m.productId === productId)?.productName ?? "este produto"}`}
                type="number"
                min={0}
                max={balance}
                step={1}
                inputMode="numeric"
                value={quantity}
                disabled={save.pending}
                error={save.fields?.quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <p className="muted record-meta">
                O restante fica com os outros produtos. Preços e pedidos são
                preservados.
              </p>
            </>
          )}
        </div>
      </Modal>
      <ErrorModal error={save.error} onClose={save.closeError} />
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="A desvinculação ainda não foi salva."
          confirmLabel="Descartar"
          onConfirm={onClose}
          onCancel={() => setDiscard(false)}
        />
      )}
    </>
  );
}
