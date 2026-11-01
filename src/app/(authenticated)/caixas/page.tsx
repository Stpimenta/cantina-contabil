import { SectionFeedback } from "@/components/ui/section-feedback";
import styles from "./page.module.css";
import Link from "next/link";
import { CashBoxBalance } from "@/presentation/cash-boxes/components/cash-box-balance";
import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createCashBoxes } from "@/server/cash-boxes/composition";
import { CashBoxActions } from "@/presentation/cash-boxes/components/cash-box-actions";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageHeader } from "@/components/layout/page-header";
import { SearchForm } from "@/components/ui/search-form";
import { PageFailure } from "@/components/ui/page-failure";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Caixas" };
export default async function CashBoxesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const params = await searchParams;
  const result = await executeOperation(
    {
      operation: "cash-box.list",
      message:
        "Não foi possível carregar os caixas. Tente novamente em instantes.",
      source: "src/app/(authenticated)/caixas/page.tsx",
      route: "/caixas",
      method: "GET",
      context: { actorId: session.user.id },
    },
    () =>
      createCashBoxes().list.execute(session, {
        query: typeof params.q === "string" ? params.q : "",
        page: Number(params.page),
      }),
  );
  return (
    <div className="stack">
      <PageHeader
        hideDescriptionOnMobile
        compactActionsOnMobile
        title="Caixas"
        icon="box"
        description="Organize os caixas por finalidade."
        actions={
          result.ok ? (
            <CashBoxActions
              key={`${result.value.query}:${result.value.page}`}
            />
          ) : undefined
        }
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <SearchForm
            action="/caixas"
            query={result.value.query}
            label="Buscar caixa por nome"
          />
          {result.value.items.length === 0 && (
            <SectionFeedback area="caixas">
              Nenhum caixa encontrado.
            </SectionFeedback>
          )}
          {result.value.items.length > 0 && (
            <ul className="record-list" aria-label="Caixas">
              {result.value.items.map((box) => (
                <li key={box.id}>
                  <Link
                    href={`/caixas/${box.id}`}
                    className="record-row record-row-centered"
                  >
                    <div className="stack-small">
                      <span className="record-title">{box.name}</span>
                      {box.description && (
                        <p
                          className={`muted ${styles.description}`}
                          title={box.description}
                        >
                          {box.description}
                        </p>
                      )}
                    </div>
                    <CashBoxBalance
                      amountCents={box.balanceCents}
                      pendingCents={box.pendingCents}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            basePath="/caixas"
            query={result.value.query}
            page={result.value.page}
            pageSize={result.value.pageSize}
            total={result.value.total}
          />
        </>
      )}
    </div>
  );
}
