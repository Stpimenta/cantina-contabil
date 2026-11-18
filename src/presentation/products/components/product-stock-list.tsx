"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Event } from "@/server/events/models/event.model";
import { Button } from "@/components/ui/button";
import { ProductIcon } from "@/components/ui/product-icon";
import { SectionFeedback } from "@/components/ui/section-feedback";
import { useCashBoxAccess } from "@/components/ui/cash-box-access";
import { formatCurrency } from "@/shared/formatting/currency";
import { StockManagerModal } from "./stock-manager-modal";
import type { EventPage } from "@/server/events/repositories/event.repository";
import type { StockEntry } from "@/server/products/models/stock-entry.model";
import styles from "./product-stock-list.module.css";
export function ProductStockList({
  category,
  balances,
  stockProductId,
  stockEntries,
}: {
  category: Event;
  stockProductId?: string;
  stockEntries: EventPage<StockEntry> | null;
  balances: { productId: string; quantity: number }[];
}) {
  const product = category.products.find((p) => p.id === stockProductId);
  const { canWriteEvent } = useCashBoxAccess();
  const router = useRouter();
  const params = useSearchParams();
  const [navigating, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);
  function navigate(productId?: string) {
    setDismissed(!productId);
    const next = new URLSearchParams(params.toString());
    next.delete("stockPage");
    if (productId) next.set("stock", productId);
    else next.delete("stock");
    startTransition(() =>
      router.replace(`/products/${category.id}${next.size ? `?${next}` : ""}`, {
        scroll: false,
      }),
    );
  }
  return (
    <section className="stack" aria-labelledby="products-title">
      <h2 id="products-title">Produtos e estoque</h2>
      {!category.products.length && (
        <SectionFeedback area="pedidos">
          Adicione produtos na edição do grupo.
        </SectionFeedback>
      )}
      <ul className="record-list" aria-label="Produtos e estoque">
        {category.products.map((p) => (
          <li key={p.id} className={`record-row ${styles.row}`}>
            <div className={styles.content}>
              <p className={`record-title ${styles.name}`}>
                <ProductIcon name={p.icon} />
                <span>{p.name}</span>
              </p>
              <p className="record-meta">{formatCurrency(p.priceCents)}</p>
            </div>
            <div className={styles.actions}>
              <div className={styles.stock}>
                <strong className={styles.stockValue}>
                  {(
                    balances.find((b) => b.productId === p.id)?.quantity ?? 0
                  ).toLocaleString("pt-BR")}
                </strong>
                <span className="muted record-meta">disponíveis</span>
              </div>
              <Button
                variant="neutral"
                disabled={navigating}
                aria-label={`Controlar estoque de ${p.name}`}
                onClick={() => navigate(p.id)}
              >
                Estoque
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {!dismissed && product && stockEntries && (
        <StockManagerModal
          key={product.id}
          categoryId={category.id}
          productId={product.id}
          productName={product.name}
          balance={
            balances.find((b) => b.productId === product.id)?.quantity ?? 0
          }
          entries={stockEntries}
          writable={canWriteEvent(category)}
          onClose={() => navigate()}
        />
      )}
    </section>
  );
}
