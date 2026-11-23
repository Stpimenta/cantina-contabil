"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Event } from "@/server/events/models/event.model";
import { Button } from "@/components/ui/button";
import { ProductIcon } from "@/components/ui/product-icon";
import { SectionFeedback } from "@/components/ui/section-feedback";
import { useCashBoxAccess } from "@/components/ui/cash-box-access";
import { formatCurrency } from "@/shared/formatting/currency";
import { SharedStockIndicator } from "./shared-stock-indicator";
import { ProductionPlan } from "./production-plan";
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
  balances: {
    productId: string;
    quantity: number;
    availableQuantity?: number;
    shared?: boolean;
    writable?: boolean;
    readable?: boolean;
  }[];
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
      router.replace(
        `/${category.kind === "product_category" ? "products" : "events"}/${category.id}${next.size ? `?${next}` : ""}`,
        {
          scroll: false,
        },
      ),
    );
  }
  return (
    <section className={styles.section} aria-labelledby="products-title">
      <div className={styles.heading}>
        <h2 id="products-title">Produtos e estoque</h2>
        <ProductionPlan eventId={category.id} />
      </div>
      {!category.products.length && (
        <SectionFeedback area="pedidos">
          Adicione produtos na edição{" "}
          {category.kind === "product_category" ? "do grupo" : "do evento"}.
        </SectionFeedback>
      )}
      <ul className="record-list" aria-label="Produtos e estoque">
        {category.products.map((p) => (
          <li key={p.id} className={styles.row}>
            <div className={styles.content}>
              <p className={`record-title ${styles.name}`}>
                <ProductIcon name={p.icon} />
                <span>{p.name}</span>
              </p>
              <div className={`record-meta ${styles.priceLine}`}>
                <span>{formatCurrency(p.priceCents)}</span>
                {balances.find((b) => b.productId === p.id)?.shared && (
                  <SharedStockIndicator />
                )}
              </div>
            </div>
            <div className={styles.actions}>
              <div className={styles.stock}>
                <strong className={styles.stockValue}>
                  {(
                    balances.find((b) => b.productId === p.id)
                      ?.availableQuantity ??
                    balances.find((b) => b.productId === p.id)?.quantity ??
                    0
                  ).toLocaleString("pt-BR")}
                </strong>
                <span className="muted record-meta">disponíveis</span>
              </div>
              <Button
                variant="neutral"
                disabled={
                  navigating ||
                  balances.find((b) => b.productId === p.id)?.readable === false
                }
                title={
                  balances.find((b) => b.productId === p.id)?.readable === false
                    ? "É necessário acesso a todos os grupos vinculados."
                    : undefined
                }
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
          shared={balances.find((b) => b.productId === product.id)?.shared}
          key={product.id}
          categoryId={category.id}
          productId={product.id}
          productName={product.name}
          balance={
            balances.find((b) => b.productId === product.id)?.quantity ?? 0
          }
          entries={stockEntries}
          writable={
            canWriteEvent(category) &&
            balances.find((b) => b.productId === product.id)?.writable !== false
          }
          onClose={() => navigate()}
        />
      )}
    </section>
  );
}
