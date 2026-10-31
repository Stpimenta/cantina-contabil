import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createMovements } from "@/server/movements/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { currentDateInSaoPaulo } from "@/shared/formatting/date-time";
import { PageFailure } from "@/components/ui/page-failure";
import { Pagination } from "@/components/ui/pagination";
import { MovementList } from "@/presentation/movements/components/movement-list";
export const metadata = { title: "Movimentações" };
export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const params = await searchParams;
  const result = await executeOperation(
    {
      operation: "movement.list",
      message: "Não foi possível carregar as movimentações. Tente novamente.",
      source: "src/app/(authenticated)/movimentacoes/page.tsx",
      route: "/movimentacoes",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => ({
      list: await createMovements().list.execute(session, {
        page: Number(params.page),
      }),
      cashBoxes: await createMovements().options.execute(session),
    }),
  );
  return (
    <div className="stack">
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <MovementList
            items={result.value.list.items.map(
              ({ fingerprint, receipts, ...item }) => ({
                ...item,
                receipts: receipts.map(({ key, ...receipt }) => receipt),
              }),
            )}
            cashBoxes={result.value.cashBoxes}
            today={currentDateInSaoPaulo()}
          />
          <Pagination
            basePath="/movimentacoes"
            page={result.value.list.page}
            pageSize={result.value.list.pageSize}
            total={result.value.list.total}
          />
        </>
      )}
    </div>
  );
}
