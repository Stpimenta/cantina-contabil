import { orderStatusSchema } from "@/server/events/inputs/event-query.input";
import { OrderFilters } from "@/presentation/events/components/order-filters";
import { redirect, notFound } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createEvents } from "@/server/events/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageFailure } from "@/components/ui/page-failure";
import { SearchForm } from "@/components/ui/search-form";
import { Pagination } from "@/components/ui/pagination";
import { OrderList } from "@/presentation/events/components/order-list";

export const metadata = { title: "Pedidos do evento" };
export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const { id } = await params;
  const query = await searchParams;
  const status = orderStatusSchema.parse(query.status);
  const filters: Record<string, string> = status === "all" ? {} : { status };
  const basePath = `/eventos/${id}/pedidos`;
  const result = await executeOperation(
    {
      operation: "event.orders.page",
      message: "Não foi possível carregar os pedidos. Tente novamente.",
      source: "src/app/(authenticated)/eventos/[id]/pedidos/page.tsx",
      route: "/eventos/[id]/pedidos",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => {
      const useCases = createEvents();
      const event = await useCases.get.execute(session, id);
      const orders = await useCases.orders.execute(session, id, {
        query: typeof query.q === "string" ? query.q : "",
        page: Number(query.page),
        status,
      });
      return { event, orders };
    },
  );
  if (!result.ok && result.error.code === "EVENT_NOT_FOUND") notFound();
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Eventos", href: "/eventos" },
          {
            label: result.ok ? result.value.event.name : "Evento",
            href: `/eventos/${id}`,
          },
          { label: "Pedidos" },
        ]}
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <OrderList
            event={result.value.event}
            orders={result.value.orders.items}
            search={
              <SearchForm
                action={basePath}
                filters={filters}
                actions={
                  <OrderFilters
                    key={`${status}:${result.value.orders.query}`}
                    basePath={basePath}
                    status={status}
                    query={result.value.orders.query}
                  />
                }
                query={result.value.orders.query}
                label="Buscar pedido pelo nome da pessoa"
              />
            }
          />
          <Pagination
            basePath={basePath}
            filters={filters}
            query={result.value.orders.query}
            page={result.value.orders.page}
            pageSize={result.value.orders.pageSize}
            total={result.value.orders.total}
          />
        </>
      )}
    </div>
  );
}
