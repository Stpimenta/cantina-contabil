import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createEvents } from "@/server/events/composition";
import { createProducts } from "@/server/products/composition";
import { eventMissing } from "@/server/events/models/event-rules";
import { executeOperation } from "@/shared/errors/execute-operation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageHeader } from "@/components/layout/page-header";
import { PageFailure } from "@/components/ui/page-failure";
import { buttonClassName } from "@/components/ui/button";
import { EventActions } from "@/presentation/events/components/event-actions";
import { EventHistory } from "@/presentation/events/components/event-history";
import { CashBoxBalance } from "@/presentation/cash-boxes/components/cash-box-balance";
import { ProductStockList } from "@/presentation/products/components/product-stock-list";
import { currentDateInSaoPaulo } from "@/shared/formatting/date-time";
import styles from "./page.module.css";
export const metadata = { title: "Produtos" };
export default async function ProductCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    history?: string;
    stock?: string;
    stockPage?: string;
  }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const { id } = await params;
  const query = await searchParams;
  const result = await executeOperation(
    {
      operation: "products.category.get",
      message:
        "Não foi possível carregar o grupo de produtos. Tente novamente.",
      source: "src/app/(authenticated)/products/[id]/page.tsx",
      route: "/products/[id]",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => {
      const useCases = createEvents();
      const category = await useCases.get.execute(session, id);
      if (category.kind !== "product_category") return eventMissing();
      const balances = await createProducts().stock.execute(session, id);
      const history = query.history
        ? await useCases.history.execute(session, id, {
            page: 1,
          })
        : null;
      const cashBoxes = await useCases.boxes.execute(session);
      const stockEntries = query.stock
        ? await createProducts().entries.execute(session, id, query.stock, {
            page: 1,
          })
        : null;
      return { category, balances, history, cashBoxes, stockEntries };
    },
  );
  if (!result.ok && result.error.code === "EVENT_NOT_FOUND") notFound();
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          ...(session.role === "operator"
            ? []
            : [{ label: "Home", href: "/" }]),
          { label: "Produtos", href: "/products" },
          { label: result.ok ? result.value.category.name : "Grupo" },
        ]}
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <PageHeader
            icon="box"
            title={result.value.category.name}
            description="Grupo de produtos"
            hideDescriptionOnMobile
            compactActionsOnMobile
            actions={
              <EventActions
                recurring
                sharedProductIds={result.value.balances
                  .filter((balance) => balance.shared)
                  .map((balance) => balance.productId)}
                event={result.value.category}
                cashBoxes={result.value.cashBoxes}
                today={currentDateInSaoPaulo()}
              />
            }
          />

          <section
            className={styles.financial}
            aria-labelledby="category-financial-title"
          >
            <h2 id="category-financial-title" className={styles.desktopOnly}>
              Situação financeira
            </h2>
            <CashBoxBalance
              prominent
              amountCents={result.value.category.realCents}
              pendingCents={result.value.category.pendingCents}
            />
            <dl className="details">
              <div>
                <dt>Caixa</dt>
                <dd>
                  <Link
                    className="text-link"
                    href={`/cash-boxes/${result.value.category.cashBoxId}`}
                  >
                    {result.value.cashBoxes.find(
                      (b) => b.id === result.value.category.cashBoxId,
                    )?.name ?? "Ver caixa"}
                  </Link>
                </dd>
              </div>
            </dl>
            <div className={styles.actions}>
              <Link
                className={buttonClassName({
                  size: "large",
                  compactOnMobile: true,
                  className: "wide-action",
                })}
                href={`/products/${id}/orders`}
              >
                Pedidos
              </Link>
              <Link
                className={buttonClassName({
                  variant: "neutral",
                  size: "large",
                  compactOnMobile: true,
                  className: "wide-action",
                })}
                href={`/products/${id}/supplies`}
              >
                Insumos
              </Link>
              <EventHistory
                recurring
                eventId={id}
                result={result.value.history}
              />
            </div>
          </section>
          {result.value.category.description && (
            <dl className="details">
              <div>
                <dt>Descrição</dt>
                <dd className="preserve-lines">
                  {result.value.category.description}
                </dd>
              </div>
            </dl>
          )}
          <ProductStockList
            category={result.value.category}
            balances={result.value.balances}
            stockProductId={query.stock}
            stockEntries={result.value.stockEntries}
          />
        </>
      )}
    </div>
  );
}
