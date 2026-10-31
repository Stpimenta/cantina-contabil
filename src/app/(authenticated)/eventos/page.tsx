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
import {
  currentDateInSaoPaulo,
  formatDateOnly,
} from "@/shared/formatting/date-time";
export const metadata = { title: "Eventos" };
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const params = await searchParams;
  const result = await executeOperation(
    {
      operation: "event.list",
      message: "Não foi possível carregar os eventos. Tente novamente.",
      source: "src/app/(authenticated)/eventos/page.tsx",
      route: "/eventos",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => {
      const useCases = createEvents();
      const list = await useCases.list.execute(session, {
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
        title="Eventos"
        icon="calendar"
        description="Pedidos, produtos e insumos de cada evento."
        actions={
          result.ok ? (
            <EventActions
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
            action="/eventos"
            query={result.value.list.query}
            label="Buscar evento por nome"
          />
          {result.value.list.items.length > 0 && (
            <ul className="record-list" aria-label="Eventos">
              {result.value.list.items.map((event) => (
                <li key={event.id}>
                  <Link
                    className="record-row record-row-centered"
                    href={`/eventos/${event.id}`}
                  >
                    <div className="stack-small">
                      <span className="record-title">{event.name}</span>
                      <p>{formatDateOnly(event.occursOn)}</p>
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
            basePath="/eventos"
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
