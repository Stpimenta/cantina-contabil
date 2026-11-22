"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EventAudit } from "@/server/events/models/event-audit.model";
import type { EventPage } from "@/server/events/repositories/event.repository";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { HistoryRecordList } from "@/components/ui/history-record-list";
import { loadEventHistoryAction } from "@/server/events/actions/load-event-history.action";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { ErrorModal } from "@/components/modals/error-modal";
import styles from "./event-history.module.css";
type HistoryResult = EventPage<EventAudit> & {
  soldProducts: { id: string; name: string; quantity: number }[];
};
import { EventAuditDetails } from "./event-audit-details";
function label(entry: EventAudit) {
  if (entry.resourceType === "stock" && entry.after.deletedAt)
    return "Entrada de estoque excluída";
  if (entry.resourceType === "stock")
    return entry.action === "create"
      ? "Entrada de estoque registrada"
      : "Entrada de estoque corrigida";
  if (
    entry.resourceType === "order" &&
    entry.action === "update" &&
    !entry.after.deletedAt &&
    JSON.stringify(entry.before?.withdrawals) !==
      JSON.stringify(entry.after.withdrawals)
  )
    return "Retirada registrada ou corrigida";
  const resource =
    entry.resourceType === "event"
      ? entry.after.kind === "product_category"
        ? "Grupo"
        : "Evento"
      : entry.resourceType === "supply"
        ? "Insumo"
        : "Pedido";
  return `${resource} ${entry.after.deletedAt ? "excluído" : entry.action === "create" ? "criado" : "atualizado"}`;
}
export function EventHistory({
  eventId,
  result,
  recurring = false,
}: {
  eventId: string;
  recurring?: boolean;
  result: HistoryResult | null;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<EventAudit | null>(null);
  const open = !!params.get("history");
  const basePath = `${recurring ? "/products" : "/events"}/${eventId}`;
  function navigate(show: boolean) {
    if (pending) return;
    const next = new URLSearchParams(params.toString());
    if (show) {
      next.set("history", "1");
      next.delete("orders");
    } else next.delete("history");
    startTransition(() =>
      router.replace(`${basePath}${next.size ? `?${next}` : ""}`, {
        scroll: false,
      }),
    );
  }
  return (
    <>
      <Button
        size="large"
        compactOnMobile
        className="wide-action"
        variant="neutral"
        busy={pending}
        onClick={() => navigate(true)}
      >
        Histórico
      </Button>
      {open && result && (
        <Modal
          open
          title={recurring ? "Histórico do grupo" : "Histórico do evento"}
          size="formCompact"
          onClose={() => navigate(false)}
          footer={
            <Button
              variant="neutral"
              disabled={pending}
              onClick={() => navigate(false)}
            >
              Fechar
            </Button>
          }
        >
          <HistoryContent
            eventId={eventId}
            initial={result}
            recurring={recurring}
            onDetails={setSelected}
          />
        </Modal>
      )}
      {open && selected && (
        <Modal
          open
          title={label(selected)}
          onClose={() => setSelected(null)}
          footer={
            <Button variant="neutral" onClick={() => setSelected(null)}>
              Fechar
            </Button>
          }
        >
          <EventAuditDetails entry={selected} />
        </Modal>
      )}
    </>
  );
}

function HistoryContent({
  eventId,
  initial,
  recurring,
  onDetails,
}: {
  eventId: string;
  initial: HistoryResult;
  recurring: boolean;
  onDetails: (entry: EventAudit) => void;
}) {
  const [entries, setEntries] = useState(initial.items);
  const [page, setPage] = useState(initial.page);
  const [total, setTotal] = useState(initial.total);
  const sentinel = useRef<HTMLDivElement>(null);
  const load = useServerAction({
    connectionMessage:
      "Não foi possível carregar o histórico. Tente novamente.",
  });
  const hasMore = page * initial.pageSize < total;
  const soldUnits = initial.soldProducts.reduce(
    (sum, product) => sum + product.quantity,
    0,
  );
  function loadMore() {
    if (!hasMore || load.isPending() || load.error) return;
    load.execute(
      () => loadEventHistoryAction(eventId, page + 1),
      (next) => {
        setEntries((current) => {
          const ids = new Set(current.map((entry) => entry.id));
          return [
            ...current,
            ...next.items.filter((entry) => !ids.has(entry.id)),
          ];
        });
        setPage(next.page);
        setTotal(next.total);
      },
    );
  }
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasMore || load.pending || load.error) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    });
    observer.observe(element);
    return () => observer.disconnect();
  });
  return (
    <div className="stack">
      <section className={styles.sales} aria-label="Produtos vendidos">
        <div className={styles.sectionHeading}>
          <h3>Produtos vendidos</h3>
          <p className={styles.total}>
            <strong>{soldUnits.toLocaleString("pt-BR")}</strong> unidades
          </p>
        </div>
        {initial.soldProducts.length ? (
          <ul className="record-list">
            {initial.soldProducts.map((product) => (
              <li key={product.id} className={styles.product}>
                <span className={styles.name}>{product.name}</span>
                <strong className={styles.quantity}>
                  {product.quantity.toLocaleString("pt-BR")} un.
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhum produto vendido.</p>
        )}
      </section>
      <section className="stack-small" aria-label="Registros do histórico">
        <div className={styles.sectionHeading}>
          <h3>Registros do histórico</h3>
          <span className="muted record-meta">
            {total.toLocaleString("pt-BR")} registros
          </span>
        </div>
        <p className="muted record-meta">
          Do mais recente ao mais antigo. Use os três pontos para ver os
          detalhes.
        </p>
        <HistoryRecordList
          label={recurring ? "Histórico do grupo" : "Histórico do evento"}
          entries={entries.map((entry) => ({
            id: entry.id,
            label: label(entry),
            actorName: entry.actorName,
            occurredAt: entry.occurredAt,
          }))}
          onDetails={(id) => {
            const entry = entries.find((item) => item.id === id);
            if (entry) onDetails(entry);
          }}
        />
        <p className="muted record-meta">
          {entries.length.toLocaleString("pt-BR")} de{" "}
          {total.toLocaleString("pt-BR")} registros carregados
        </p>
        {hasMore && (
          <div ref={sentinel}>
            <Button
              variant="neutral"
              disabled={load.pending || !!load.error}
              onClick={loadMore}
            >
              Carregar mais registros
            </Button>
          </div>
        )}
        <span className="sr-only" role="status">
          {load.pending ? "Carregando histórico" : ""}
        </span>
      </section>
      <ErrorModal error={load.error} onClose={load.closeError} />
    </div>
  );
}
