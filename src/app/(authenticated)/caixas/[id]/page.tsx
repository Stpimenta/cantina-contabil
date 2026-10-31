import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CashBoxBalance } from "@/presentation/cash-boxes/components/cash-box-balance";
import { redirect, notFound } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createCashBoxes } from "@/server/cash-boxes/composition";
import { CashBoxActions } from "@/presentation/cash-boxes/components/cash-box-actions";
import type { CashBoxHistoryCategory } from "@/server/cash-boxes/models/cash-box-history-entry.model";
import { CashBoxHistory } from "@/presentation/cash-boxes/components/cash-box-history";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageHeader } from "@/components/layout/page-header";
import { PageFailure } from "@/components/ui/page-failure";
import { CashBoxHistoryModal } from "@/components/modals/cash-box-history-modal";

export const metadata = { title: "Detalhes do caixa" };
export default async function CashBoxPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ history?: string; category?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const { id } = await params;
  const query = await searchParams;
  const category: CashBoxHistoryCategory = [
    "events",
    "incoming",
    "outgoing",
  ].includes(query.category ?? "")
    ? (query.category as CashBoxHistoryCategory)
    : "all";
  const context = { actorId: session.user.id, cashBoxId: id };
  const result = await executeOperation(
    {
      operation: "cash-box.get",
      message:
        "Não foi possível carregar este caixa. Tente novamente em instantes.",
      source: "src/app/(authenticated)/caixas/[id]/page.tsx",
      route: "/caixas/[id]",
      method: "GET",
      context,
    },
    () => createCashBoxes().get.execute(session, id),
  );
  const history = result.ok
    ? await executeOperation(
        {
          operation: "cash-box.history",
          message:
            "Não foi possível carregar o histórico. Tente novamente em instantes.",
          source: "src/app/(authenticated)/caixas/[id]/page.tsx",
          route: "/caixas/[id]",
          method: "GET",
          context,
        },
        () =>
          createCashBoxes().history.execute(
            session,
            id,
            Number(query.history) || 1,
            category,
          ),
      )
    : null;
  if (!result.ok && result.error.category === "not_found") notFound();
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Caixas", href: "/caixas" },
          { label: result.ok ? result.value.name : "Caixa" },
        ]}
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <PageHeader
            icon="box"
            compactActionsOnMobile
            title={result.value.name}
            description="Detalhes do caixa"
            actions={<CashBoxActions box={result.value} />}
          />
          <CashBoxBalance
            amountCents={result.value.balanceCents}
            pendingCents={result.value.pendingCents}
            prominent
          />
          <dl className="details">
            <div>
              <dt>Descrição</dt>
              <dd className="preserve-lines">
                {result.value.description || "Não informada"}
              </dd>
            </div>
            <div>
              <dt>Criado por</dt>
              <dd>{result.value.createdByName}</dd>
            </div>
          </dl>
          <div className="centered-actions">
            <CashBoxHistoryModal
              boxId={id}
              initialOpen={Boolean(query.history)}
            >
              {history && (
                <CashBoxHistory id={id} category={category} result={history} />
              )}
            </CashBoxHistoryModal>
          </div>
        </>
      )}
    </div>
  );
}
