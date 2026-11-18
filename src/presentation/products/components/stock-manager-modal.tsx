"use client";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { StockEntry } from "@/server/products/models/stock-entry.model";
import type { EventPage } from "@/server/events/repositories/event.repository";
import { deleteStockEntryAction } from "@/server/products/actions/delete-stock-entry.action";
import { Icon } from "@/components/ui/icon";
import { saveStockEntryAction } from "@/server/products/actions/save-stock-entry.action";
import { updateStockEntriesAction } from "@/server/products/actions/update-stock-entries.action";
import {
  validateStockEntry,
  validateUpdateStockEntries,
} from "@/server/products/inputs/stock.input";
import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
import { createRequestId } from "@/shared/identifiers/request-id";
import { formatDateTime } from "@/shared/formatting/date-time";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { Modal } from "@/components/modals/modal";
import {
  ConfirmationModal,
  deletionConfirmationMessage,
} from "@/components/modals/confirmation-modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Field } from "@/components/ui/field";
import { loadStockEntriesAction } from "@/server/products/actions/load-stock-entries.action";
import { SectionFeedback } from "@/components/ui/section-feedback";
import { useToast } from "@/components/ui/toast-provider";
import styles from "./stock-manager-modal.module.css";
export function StockManagerModal({
  categoryId,
  productId,
  productName,
  balance,
  entries,
  writable,
  onClose,
}: {
  categoryId: string;
  productId: string;
  productName: string;
  balance: number;
  entries: EventPage<StockEntry>;
  writable: boolean;
  onClose: () => void;
}) {
  const id = useId();
  const historyRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(entries.items);
  const [hasMore, setHasMore] = useState(entries.page * entries.pageSize < entries.total);
  const [cursor, setCursor] = useState(() => {
    const last = entries.items.at(-1);
    return last ? { createdAt: last.createdAt, id: last.id } : null;
  });
  const load = useServerAction({
    connectionMessage: "Não foi possível carregar as entradas. Tente novamente.",
  });
  // Refresh existing rows after deletion without discarding older loaded rows or drafts.
  useEffect(() => {
    setLoaded((current) => current.map((entry) =>
      entries.items.find((fresh) => fresh.id === entry.id) ?? entry,
    ));
  }, [entries]);
  function loadMore() {
    if (!hasMore || load.isPending() || load.error || locked()) return;
    load.execute(() => loadStockEntriesAction(categoryId, productId, cursor), (page) => {
      setLoaded((current) => {
        const ids = new Set(current.map((entry) => entry.id));
        return [...current, ...page.items.filter((entry) => !ids.has(entry.id))];
      });
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    });
  }
  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore || load.error) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { root: historyRef.current });
    observer.observe(target);
    return () => observer.disconnect();
  });
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [deleting, setDeleting] = useState<{
    entry: StockEntry;
    requestId: string;
  } | null>(null);
  const notify = useToast();
  const [requestId, setRequestId] = useState(createRequestId);
  const [correctionId, setCorrectionId] = useState(createRequestId);
  const [quantity, setQuantity] = useState("1");
  const [drafts, setDrafts] = useState<
    Record<string, { entry: StockEntry; value: string }>
  >({});
  const [discard, setDiscard] = useState(false);
  const changes = Object.values(drafts);
  const visibleEntries = loaded;
  const input = {
    requestId,
    categoryId,
    productId,
    entryId: requestId,
    expectedVersion: 0,
    quantity: /^\d+$/.test(quantity) ? Number(quantity) : NaN,
  };
  const correctionInput = {
    requestId: correctionId,
    categoryId,
    productId,
    entries: changes.map(({ entry, value }) => ({
      entryId: entry.id,
      expectedVersion: entry.version,
      quantity: /^\d+$/.test(value) ? Number(value) : NaN,
    })),
  };
  const fieldIds: Record<string, string> = {};
  changes.forEach(({ entry }, index) => {
    fieldIds[`entries.${index}.quantity`] = `${id}-entry-${entry.id}`;
  });
  if (changes[0]) fieldIds.entries = `${id}-entry-${changes[0].entry.id}`;
  const combinedInput = {
    ...correctionInput,
    requestId,
    addition: { entryId: requestId, quantity: input.quantity },
  };
  const save = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a entrada. Confira o estoque antes de repetir.",
    fieldIds: {
      ...fieldIds,
      quantity: `${id}-quantity`,
      "addition.quantity": `${id}-quantity`,
    },
    validationKey: JSON.stringify({ input, combinedInput }),
    validate: () => {
      const r = changes.length
        ? validateUpdateStockEntries(combinedInput)
        : validateStockEntry(input);
      return r.ok ? null : presentBusinessFailure(r.error);
    },
  });
  const correction = useServerAction({
    connectionMessage:
      "Não foi possível confirmar as alterações. Confira o estoque antes de repetir.",
    fieldIds,
    validationKey: JSON.stringify(correctionInput),
    validate: () => {
      const r = validateUpdateStockEntries(correctionInput);
      return r.ok ? null : presentBusinessFailure(r.error);
    },
  });
  const remove = useServerAction({
    connectionMessage:
      "Não foi possível confirmar a exclusão. Confira o estoque antes de repetir.",
  });
  const busy =
    save.pending || correction.pending || remove.pending || refreshing || load.pending;
  const dirty = quantity !== "1" || changes.length > 0;
  useUnsavedChanges(dirty);
  function locked() {
    return (
      save.isPending() ||
      correction.isPending() ||
      remove.isPending() ||
      load.isPending() ||
      refreshing
    );
  }
  function close() {
    if (locked()) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function add(e: FormEvent) {
    e.preventDefault();
    if (locked() || !writable) return;
    save.execute<unknown>(
      () =>
        changes.length
          ? updateStockEntriesAction(combinedInput)
          : saveStockEntryAction(input),
      () => {
        notify("Estoque atualizado.");
        setQuantity("1");
        setRequestId(createRequestId());
        setDrafts({});
        onClose();
      },
    );
  }
  function saveChanges(e: FormEvent) {
    e.preventDefault();
    if (locked() || !writable || !changes.length) return;
    correction.execute(
      () => updateStockEntriesAction(correctionInput),
      () => {
        setDrafts({});
        setCorrectionId(createRequestId());
        notify("Alterações de estoque salvas.");
        onClose();
      },
    );
  }
  function deleteEntry() {
    if (!deleting || locked() || !writable) return;
    const { entry, requestId: deletionId } = deleting;
    remove.execute(
      () =>
        deleteStockEntryAction({
          requestId: deletionId,
          categoryId,
          productId,
          entryId: entry.id,
          expectedVersion: entry.version,
        }),
      () => {
        setDrafts((current) => {
          const next = { ...current };
          delete next[entry.id];
          return next;
        });
        setLoaded((current) => current.filter((item) => item.id !== entry.id));
        setDeleting(null);
        notify("Entrada excluída.");
        startRefresh(() => router.refresh());
      },
    );
  }
  return (
    <>
      <Modal
        open
        size="standard"
        title="Estoque"
        onClose={close}
        footer={
          <>
            <Button
              variant="neutral"
              compactOnMobile
              disabled={busy}
              onClick={close}
            >
              Fechar
            </Button>
            {writable && (
              <Button
                type="submit"
                form={`${id}-changes`}
                compactOnMobile
                busy={correction.pending}
                disabled={busy || !changes.length}
              >
                Salvar alterações
              </Button>
            )}
          </>
        }
      >
        <div className="stack">
          <div className={styles.header}>
            <p className={styles.productName}>{productName}</p>
            <div className={styles.balance}>
              <span className="muted record-meta">Estoque atual</span>
              <strong>{balance.toLocaleString("pt-BR")}</strong>
            </div>
          </div>
          {writable && (
            <form className={styles.entryForm} noValidate onSubmit={add}>
              <QuantityStepper
                id={`${id}-quantity`}
                label="Quantidade"
                value={quantity}
                onValueChange={setQuantity}
                disabled={busy}
                error={save.fields?.quantity}
              />
              <Button
                type="submit"
                className={styles.addAction}
                busy={save.pending}
                disabled={busy}
              >
                Adicionar
              </Button>
            </form>
          )}
          <form
            id={`${id}-changes`}
            className="stack-small"
            noValidate
            onSubmit={saveChanges}
          >
            <h2 id={`${id}-entries-title`}>Entradas registradas</h2>
            <div
              ref={historyRef}
              className={styles.history}
              role="region"
              tabIndex={0}
              aria-labelledby={`${id}-entries-title`}
            >
              {!visibleEntries.length && (
                <SectionFeedback area="pedidos">
                  Nenhuma entrada de estoque registrada.
                </SectionFeedback>
              )}
              <ul className="record-list">
                {visibleEntries.map((entry) => {
                  const index = changes.findIndex(
                    (change) => change.entry.id === entry.id,
                  );
                  return (
                    <li key={entry.id} className={styles.row}>
                      <div className={styles.content}>
                        <p className="muted record-meta">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                      <div className={styles.entryControls}>
                        <div className={styles.entryQuantity}>
                          <Field
                            id={`${id}-entry-${entry.id}`}
                            name={`quantity-${entry.id}`}
                            label={`Quantidade da entrada de ${formatDateTime(entry.createdAt)}`}
                            hideLabel
                            type="number"
                            min={0}
                            max={Number.MAX_SAFE_INTEGER}
                            step={1}
                            appearance="quantityNative"
                            inputMode="numeric"
                            value={
                              drafts[entry.id]?.value ?? String(entry.quantity)
                            }
                            disabled={
                              !writable ||
                              busy ||
                              (changes.length >= DEFAULT_PAGE_SIZE &&
                                !drafts[entry.id])
                            }
                            onChange={(e) => {
                              if (
                                e.target.validity.badInput ||
                                !/^\d*$/.test(e.target.value)
                              )
                                return;
                              const value = e.target.value;
                              setDrafts((current) => {
                                const next = { ...current };
                                if (
                                  value ===
                                  String(
                                    (current[entry.id]?.entry ?? entry)
                                      .quantity,
                                  )
                                )
                                  delete next[entry.id];
                                else
                                  next[entry.id] = {
                                    entry: current[entry.id]?.entry ?? entry,
                                    value,
                                  };
                                return next;
                              });
                            }}
                            error={
                              index >= 0
                                ? (save.fields?.[`entries.${index}.quantity`] ??
                                  correction.fields?.[
                                    `entries.${index}.quantity`
                                  ])
                                : undefined
                            }
                          />
                        </div>
                        {writable && (
                          <Button
                            type="button"
                            variant="ghost"
                            iconOnly
                            aria-label={`Excluir entrada de ${formatDateTime(entry.createdAt)}`}
                            title="Excluir entrada"
                            disabled={busy}
                            onClick={() =>
                              setDeleting({
                                entry: drafts[entry.id]?.entry ?? entry,
                                requestId: createRequestId(),
                              })
                            }
                          >
                            <Icon name="trash" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {hasMore && (
                <div ref={sentinelRef} className={styles.loadMore}>
                  <Button type="button" variant="ghost" disabled={busy || load.pending} onClick={loadMore}>
                    {load.pending ? "Carregando entradas…" : "Carregar mais"}
                  </Button>
                </div>
              )}
              <span className="sr-only" role="status">{load.pending ? "Carregando entradas" : ""}</span>
            </div>
            {changes.length >= DEFAULT_PAGE_SIZE && (
              <p className="muted record-meta">
                Salve as alterações pendentes para editar mais entradas.
              </p>
            )}
          </form>
          <span className="sr-only" role="status">
            {busy ? "Atualizando estoque" : ""}
          </span>
        </div>
      </Modal>
      <ErrorModal
        error={save.error ?? correction.error ?? remove.error ?? load.error}
        onClose={() => {
          save.closeError();
          correction.closeError();
          remove.closeError();
          load.closeError();
        }}
      />
      {deleting && (
        <ConfirmationModal
          title="Excluir entrada?"
          message={deletionConfirmationMessage}
          confirmLabel="Excluir"
          busy={busy}
          onConfirm={deleteEntry}
          onCancel={() => {
            if (!locked()) setDeleting(null);
          }}
        />
      )}
      {discard && (
        <ConfirmationModal
          title="Descartar alterações?"
          message="As alterações ainda não foram salvas."
          confirmLabel="Descartar"
          onConfirm={() => {
            setDiscard(false);
            onClose();
          }}
          onCancel={() => setDiscard(false)}
        />
      )}
    </>
  );
}
