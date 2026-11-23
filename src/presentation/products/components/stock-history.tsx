"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/modals/error-modal";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { formatDateTime } from "@/shared/formatting/date-time";
import { loadStockHistoryAction } from "@/server/products/actions/shared-stock.action";
import type {
  SharedStockHistory,
  StockMember,
} from "@/server/products/models/shared-stock.model";
function quantity(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== "object") return "—";
  const value = snapshot as { quantity?: unknown; deletedAt?: unknown };
  return value.deletedAt
    ? "Excluída"
    : typeof value.quantity === "number"
      ? value.quantity.toLocaleString("pt-BR")
      : "—";
}
export function StockHistory({
  categoryId,
  productId,
  initial,
}: {
  categoryId: string;
  productId: string;
  initial: { items: SharedStockHistory[]; hasMore: boolean };
}) {
  const [items, setItems] = useState<SharedStockHistory[]>(initial.items),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(initial.hasMore);
  const load = useServerAction({
    connectionMessage:
      "Não foi possível consultar o histórico. Tente novamente.",
  });
  function fetch(next: number) {
    if (load.isPending()) return;
    load.execute(
      () => loadStockHistoryAction(categoryId, productId, next),
      (result) => {
        setItems((current) =>
          next === 1 ? result.items : [...(current ?? []), ...result.items],
        );
        setPage(next);
        setHasMore(result.hasMore);
      },
    );
  }
  return (
    <>
      <div className="stack">
        <ul className="record-list">
          {items.map((item) => (
            <li key={item.id} className="record-row">
              <div className="stack-small">
                <p className="record-title">
                  {item.action === "link"
                    ? "Estoque vinculado"
                    : item.action === "unlink"
                      ? "Produto desvinculado"
                      : item.action === "withdrawal"
                        ? "Retirada / correção de retirada"
                        : item.action === "create"
                          ? "Entrada de estoque"
                          : "Correção de estoque"}
                </p>
                <p className="muted record-meta">
                  {item.actorName} · {formatDateTime(item.occurredAt)}
                </p>
                {Array.isArray(item.after) ? (
                  <ul>
                    {(item.after as StockMember[]).map((m) => (
                      <li key={`${m.eventId}:${m.productId}`}>
                        {m.productName} — {m.categoryName}:{" "}
                        {Array.isArray(item.before)
                          ? (
                              (item.before as StockMember[]).find(
                                (old) =>
                                  old.eventId === m.eventId &&
                                  old.productId === m.productId,
                              )?.quantity ?? 0
                            ).toLocaleString("pt-BR")
                          : "—"}{" "}
                        → {m.quantity.toLocaleString("pt-BR")} un.
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p>
                      {item.productName} — {item.categoryName}
                    </p>
                    <p>
                      {quantity(item.before)} → {quantity(item.after)} un.
                    </p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        {!items.length && (
          <p className="muted">Nenhuma movimentação registrada.</p>
        )}
        {hasMore && (
          <Button
            variant="neutral"
            busy={load.pending}
            onClick={() => fetch(page + 1)}
          >
            Carregar mais registros
          </Button>
        )}
      </div>
      <ErrorModal error={load.error} onClose={load.closeError} />
    </>
  );
}
