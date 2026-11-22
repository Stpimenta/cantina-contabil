import { createProducts } from "@/server/products/composition";
import { SectionFeedback } from "@/components/ui/section-feedback";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createEvents } from "@/server/events/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageFailure } from "@/components/ui/page-failure";
import { PageHeader } from "@/components/layout/page-header";
import { SearchForm } from "@/components/ui/search-form";
import { Pagination } from "@/components/ui/pagination";
import { EventActions } from "@/presentation/events/components/event-actions";
import { CashBoxBalance } from "@/presentation/cash-boxes/components/cash-box-balance";
import { currentDateInSaoPaulo } from "@/shared/formatting/date-time";
export const metadata = { title: "Produtos" };
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const params = await searchParams;
  const result = await executeOperation(
    {
      operation: "products.list",
      message:
        "Não foi possível carregar os grupos de produtos. Tente novamente.",
      source: "src/app/(authenticated)/products/page.tsx",
      route: "/products",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => {
      const useCases = createEvents();
      const list = await createProducts().list.execute(session, {
        query: typeof params.q === "string" ? params.q : "",
        page: Number(params.page),
      });
      const cashBoxes = await useCases.boxes.execute(session);
      return { list, cashBoxes };
    },
  );
  return (
    <div className="stack">
      <PageHeader
        hideDescriptionOnMobile
        compactActionsOnMobile
        title="Produtos"
        icon="box"
        description="Vendas recorrentes organizadas por grupo de produtos."
        actions={
          result.ok ? (
            <EventActions
              recurring
              cashBoxes={result.value.cashBoxes}
              today={currentDateInSaoPaulo()}
            />
          ) : undefined
        }
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <SearchForm
            compactActionsOnMobile
            action="/products"
            query={result.value.list.query}
            label="Buscar pelo nome"
          />
          {result.value.list.items.length === 0 && (
            <SectionFeedback area="eventos">
              Nenhum grupo de produtos encontrado.
            </SectionFeedback>
          )}
          {result.value.list.items.length > 0 && (
            <ul className="record-list" aria-label="Produtos">
              {result.value.list.items.map((event) => (
                <li key={event.id}>
                  <Link
                    className="record-row record-row-centered"
                    href={`/products/${event.id}`}
                  >
                    <div className="stack-small">
                      <span className="record-title">{event.name}</span>
                      <p className="muted record-meta">
                        {event.products.length} produto(s)
                      </p>
                    </div>
                    <CashBoxBalance
                      amountCents={event.realCents}
                      pendingCents={event.pendingCents}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            basePath="/products"
            query={result.value.list.query}
            page={result.value.list.page}
            pageSize={result.value.list.pageSize}
            total={result.value.list.total}
          />
        </>
      )}
    </div>
  );
}
