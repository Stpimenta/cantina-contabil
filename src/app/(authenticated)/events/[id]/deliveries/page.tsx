import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createDeliveries } from "@/server/deliveries/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageFailure } from "@/components/ui/page-failure";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DeliveryManager } from "@/presentation/deliveries/components/delivery-manager";
export const metadata = { title: "Rotas de entrega" };
export default async function DeliveriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const { id } = await params,
    query = await searchParams;
  const result = await executeOperation(
    {
      operation: "deliveries.page",
      message: "Não foi possível carregar as rotas.",
      source: "src/app/(authenticated)/events/[id]/deliveries/page.tsx",
      route: "/events/[id]/deliveries",
      method: "GET",
    },
    () => createDeliveries().list.execute(session, id, query),
  );
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          ...(session.role === "operator"
            ? []
            : [{ label: "Home", href: "/" }]),
          { label: "Eventos", href: "/events" },
          {
            label: result.ok ? result.value.eventName : "Evento",
            href: `/events/${id}`,
          },
          { label: "Rotas de entrega" },
        ]}
      />
      <PageHeader
        icon="calendar"
        title="Rotas de entrega"
        description={
          result.ok ? `Evento: ${result.value.eventName}` : "Entregas do evento"
        }
      />
      {result.ok ? (
        <DeliveryManager board={result.value} />
      ) : (
        <PageFailure error={result.error} />
      )}
    </div>
  );
}
