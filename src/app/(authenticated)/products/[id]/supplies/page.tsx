import { redirect, notFound } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { eventMissing } from "@/server/events/models/event-rules";
import { createEvents } from "@/server/events/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageFailure } from "@/components/ui/page-failure";
import { Pagination } from "@/components/ui/pagination";
import { SupplyList } from "@/presentation/events/components/supply-list";

export const metadata = { title: "Insumos dos produtos" };
export default async function SuppliesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const { id } = await params;
  const query = await searchParams;
  const basePath = `/products/${id}/supplies`;
  const result = await executeOperation(
    {
      operation: "event.supplies.page",
      message: "Não foi possível carregar os insumos. Tente novamente.",
      source: "src/app/(authenticated)/products/[id]/supplies/page.tsx",
      route: "/products/[id]/supplies",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => {
      const useCases = createEvents();
      const event = await useCases.get.execute(session, id);
      if (event.kind !== "product_category") return eventMissing();
      const supplies = await useCases.supplies.execute(session, id, {
        page: Number(query.page),
      });
      const cashBoxes = await useCases.boxes.execute(session);
      return { event, supplies, cashBoxes };
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
          {
            label: result.ok ? result.value.event.name : "Grupo",
            href: `/products/${id}`,
          },
          { label: "Insumos" },
        ]}
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <SupplyList
            recurring
            eventId={id}
            eventCashBoxId={result.value.event.cashBoxId}
            eventName={result.value.event.name}
            supplyCostCents={result.value.event.supplyCostCents}
            cashBoxes={result.value.cashBoxes}
            supplies={result.value.supplies.items.map(
              ({
                receiptKey: _receiptKey,
                receipts,
                fingerprint: _fingerprint,
                ...supply
              }) => ({
                ...supply,
                hasReceipt: receipts.length > 0,
                receipts: receipts.map(({ key: _key, ...receipt }) => receipt),
              }),
            )}
          />
          <Pagination
            basePath={basePath}
            page={result.value.supplies.page}
            pageSize={result.value.supplies.pageSize}
            total={result.value.supplies.total}
          />
        </>
      )}
    </div>
  );
}
