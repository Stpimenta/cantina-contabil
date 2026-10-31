import { redirect, notFound } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createEvents } from "@/server/events/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageFailure } from "@/components/ui/page-failure";
import { Pagination } from "@/components/ui/pagination";
import { SupplyList } from "@/presentation/events/components/supply-list";

export const metadata = { title: "Insumos do evento" };
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
  const basePath = `/eventos/${id}/insumos`;
  const result = await executeOperation(
    {
      operation: "event.supplies.page",
      message: "Não foi possível carregar os insumos. Tente novamente.",
      source: "src/app/(authenticated)/eventos/[id]/insumos/page.tsx",
      route: "/eventos/[id]/insumos",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => {
      const useCases = createEvents();
      const event = await useCases.get.execute(session, id);
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
          { label: "Home", href: "/" },
          { label: "Eventos", href: "/eventos" },
          {
            label: result.ok ? result.value.event.name : "Evento",
            href: `/eventos/${id}`,
          },
          { label: "Insumos" },
        ]}
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <SupplyList
            eventId={id}
            eventName={result.value.event.name}
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
