import {
  orderStatusSchema,
  orderPeriodSchema,
  orderFulfillmentFilterSchema,
} from "@/server/events/inputs/event-query.input";
import { OrderFilters } from "@/presentation/events/components/order-filters";
import { redirect, notFound } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { eventMissing } from "@/server/events/models/event-rules";
import { createEvents } from "@/server/events/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageFailure } from "@/components/ui/page-failure";
import { SearchForm } from "@/components/ui/search-form";
import { Pagination } from "@/components/ui/pagination";
import { OrderList } from "@/presentation/events/components/order-list";

export const metadata = { title: "Pedidos de produtos" };
export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    fulfillment?: string;
    period?: string;
  }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const { id } = await params;
  const query = await searchParams;
  const period = orderPeriodSchema.parse(query.period);
  const status = orderStatusSchema.parse(query.status);
  const requestedFulfillment = orderFulfillmentFilterSchema.parse(
    query.fulfillment,
  );
  const basePath = `/products/${id}/orders`;
  const result = await executeOperation(
    {
      operation: "event.orders.page",
      message: "Não foi possível carregar os pedidos. Tente novamente.",
      source: "src/app/(authenticated)/products/[id]/orders/page.tsx",
      route: "/products/[id]/orders",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => {
      const useCases = createEvents();
      const event = await useCases.get.execute(session, id);
      if (event.kind !== "product_category") return eventMissing();
      const fulfillment = requestedFulfillment;
      const orders = await useCases.orders.execute(session, id, {
        query: typeof query.q === "string" ? query.q : "",
        page: Number(query.page),
        status,
        period,
        fulfillment,
      });
      return { event, orders, fulfillment };
    },
  );
  if (!result.ok && result.error.code === "EVENT_NOT_FOUND") notFound();
  const filters: Record<string, string> = {
    ...(period === "all" ? {} : { period }),
    ...(status === "all" ? {} : { status }),
    ...(result.ok && result.value.fulfillment !== "all"
      ? { fulfillment: result.value.fulfillment }
      : {}),
  };
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          ...(session.role === "operator"
            ? []
            : [{ label: "Home", href: "/" }]),
          { label: "Produtos", href: "/products" },
          {
            label: result.ok ? result.value.event.name : "Grupo",
            href: `/products/${id}`,
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
                key="order-search"
                compactActionsOnMobile
                action={basePath}
                filters={filters}
                actions={
                  <OrderFilters
                    key={`${period}:${status}:${result.value.fulfillment}:${result.value.orders.query}`}
                    basePath={basePath}
                    status={status}
                    period={period}
                    deliveryEnabled={result.value.event.deliveryEnabled}
                    fulfillment={result.value.fulfillment}
                    query={result.value.orders.query}
                  />
                }
                query={result.value.orders.query}
                label="Buscar pelo nome"
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
