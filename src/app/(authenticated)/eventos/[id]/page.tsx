import { formatCurrency } from "@/shared/formatting/currency";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import styles from "./page.module.css";
import { redirect, notFound } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createEvents } from "@/server/events/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageFailure } from "@/components/ui/page-failure";
import { PageHeader } from "@/components/layout/page-header";
import { EventActions } from "@/presentation/events/components/event-actions";
import { EventOrders } from "@/presentation/events/components/event-orders";
import { EventHistory } from "@/presentation/events/components/event-history";
import { CashBoxBalance } from "@/presentation/cash-boxes/components/cash-box-balance";
import {
  currentDateInSaoPaulo,
  formatDateOnly,
} from "@/shared/formatting/date-time";
export const metadata = { title: "Detalhes do evento" };
export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    history?: string;
    orders?: string;
  }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const { id } = await params;
  const query = await searchParams;
  if (query.orders === "1") {
    const next = new URLSearchParams();
    if (typeof query.q === "string" && query.q) next.set("q", query.q);
    if (typeof query.page === "string" && query.page)
      next.set("page", query.page);
    redirect(`/eventos/${id}/pedidos${next.size ? `?${next}` : ""}`);
  }
  const result = await executeOperation(
    {
      operation: "event.get",
      message: "Não foi possível carregar o evento. Tente novamente.",
      source: "src/app/(authenticated)/eventos/[id]/page.tsx",
      route: "/eventos/[id]",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => {
      const useCases = createEvents();
      const event = await useCases.get.execute(session, id);
      const history = query.history
        ? await useCases.history.execute(session, id, {
            page: Number(query.history),
          })
        : null;
      const cashBoxes = await useCases.boxes.execute(session);
      return { event, history, cashBoxes };
    },
  );
  if (!result.ok && result.error.code === "EVENT_NOT_FOUND") notFound();
  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Eventos", href: "/eventos" },
          { label: result.ok ? result.value.event.name : "Evento" },
        ]}
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <PageHeader
            icon="calendar"
            compactActionsOnMobile
            title={result.value.event.name}
            description="Detalhes do evento"
            actions={
              <EventActions
                event={result.value.event}
                cashBoxes={result.value.cashBoxes}
                today={currentDateInSaoPaulo()}
              />
            }
          />
          <section
            className={styles.financial}
            aria-labelledby="event-financial-title"
          >
            <h2 id="event-financial-title">Situação financeira</h2>
            <div className={styles.summary}>
              <CashBoxBalance
                amountCents={result.value.event.realCents}
                pendingCents={result.value.event.pendingCents}
                prominent
              />
              <div
                className={`muted record-meta ${styles.payments}`}
                aria-label="Recebimentos por forma de pagamento e gastos com insumos"
              >
                <p>
                  <span>Dinheiro:</span>{" "}
                  <span>{formatCurrency(result.value.event.cashCents)}</span>
                </p>
                <p>
                  <span>Pix:</span>{" "}
                  <span>{formatCurrency(result.value.event.pixCents)}</span>
                </p>
                <p>
                  <span>Insumos:</span>{" "}
                  <span>
                    {formatCurrency(result.value.event.supplyCostCents)}
                  </span>
                </p>
              </div>
              <div className={styles.statistics}>
                <div className={styles.metric}>
                  <p className="muted record-meta">Produtos vendidos</p>
                  <p className="balance-value">
                    {result.value.event.soldUnits.toLocaleString("pt-BR")}{" "}
                    {result.value.event.soldUnits === 1
                      ? "unidade"
                      : "unidades"}
                  </p>
                </div>
              </div>
            </div>
            <div className={styles.actions}>
              <EventOrders eventId={id} />
              <Link
                href={`/eventos/${id}/insumos`}
                className={buttonClassName({
                  size: "large",
                  compactOnMobile: true,
                  className: "wide-action",
                  variant: "neutral",
                })}
              >
                Insumos
              </Link>
              <EventHistory eventId={id} result={result.value.history} />
            </div>
          </section>
          <section
            className={styles.information}
            aria-labelledby="event-information-title"
          >
            <h2 id="event-information-title">Informações do evento</h2>
            <dl className={`details ${styles.eventDetails}`}>
              <div>
                <dt>Data</dt>
                <dd>{formatDateOnly(result.value.event.occursOn)}</dd>
              </div>
              <div>
                <dt>Caixa</dt>
                <dd>
                  <Link
                    className="text-link"
                    href={`/caixas/${result.value.event.cashBoxId}`}
                  >
                    {result.value.cashBoxes.find(
                      (b) => b.id === result.value.event.cashBoxId,
                    )?.name ?? "Ver caixa"}
                  </Link>
                </dd>
              </div>
              {result.value.event.description && (
                <div>
                  <dt>Descrição</dt>
                  <dd className="preserve-lines">
                    {result.value.event.description}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}
