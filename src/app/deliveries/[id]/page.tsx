import { createDeliveries } from "@/server/deliveries/composition";
import { deliveryCredential } from "@/server/deliveries/infrastructure/http-identity";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageFailure } from "@/components/ui/page-failure";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/ui/pagination";
import { DeliveryRouteList } from "@/presentation/deliveries/components/delivery-route-list";
import { DeliveryAddress } from "@/presentation/deliveries/components/delivery-address";
import { RefreshDeliveries } from "@/presentation/deliveries/components/refresh-deliveries";
import styles from "@/presentation/deliveries/components/deliveries.module.css";
export const metadata = {
  title: "Minhas entregas",
  referrer: "no-referrer" as const,
};
export default async function DriverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params,
    query = await searchParams;
  const result = await executeOperation(
    {
      operation: "deliveries.driverPage",
      message: "Não foi possível carregar suas entregas.",
      source: "src/app/deliveries/[id]/page.tsx",
      route: "/deliveries/[id]",
      method: "GET",
    },
    async () =>
      createDeliveries().driverList.execute(
        await deliveryCredential(),
        id,
        query,
      ),
  );
  return (
    <main className={`${styles.shell} stack`}>
      <PageHeader
        icon="calendar"
        title="Minhas entregas"
        description={
          result.ok
            ? `${result.value.eventName} · ${result.value.driverName}`
            : "Acesso às entregas"
        }
        actions={<RefreshDeliveries />}
      />
      {result.ok ? (
        <>
          {result.value.origin && (
            <section className="stack-small">
              <h2>Ponto de saída</h2>
              <DeliveryAddress address={result.value.origin} navigation />
            </section>
          )}
          <DeliveryRouteList
            temporary
            eventId={id}
            routes={result.value.routes.items}
          />
          <Pagination basePath={`/deliveries/${id}`} {...result.value.routes} />
        </>
      ) : (
        <PageFailure error={result.error} />
      )}
    </main>
  );
}
