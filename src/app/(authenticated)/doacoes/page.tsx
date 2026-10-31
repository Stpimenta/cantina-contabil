import { DonationList } from "@/presentation/donations/components/donation-list";
import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createDonations } from "@/server/donations/composition";
import { DonationActions } from "@/presentation/donations/components/donation-actions";
import { DonationFilters } from "@/presentation/donations/components/donation-filters";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageHeader } from "@/components/layout/page-header";
import { PageFailure } from "@/components/ui/page-failure";
import { SearchForm } from "@/components/ui/search-form";
import { Pagination } from "@/components/ui/pagination";
import { currentDateInSaoPaulo } from "@/shared/formatting/date-time";
export const metadata = { title: "Doações" };
export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cashBoxId?: string;
    year?: string;
    page?: string;
  }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const params = await searchParams;
  const filters = {
    query: typeof params.q === "string" ? params.q : "",
    cashBoxId: typeof params.cashBoxId === "string" ? params.cashBoxId : "",
    year: typeof params.year === "string" ? params.year : "",
    page: Number(params.page),
  };
  const result = await executeOperation(
    {
      operation: "donation.list",
      message:
        "Não foi possível carregar as doações. Tente novamente em instantes.",
      source: "src/app/(authenticated)/doacoes/page.tsx",
      route: "/doacoes",
      method: "GET",
      context: { actorId: session.user.id },
    },
    async () => {
      const useCases = createDonations();
      const list = await useCases.list.execute(session, filters);
      const options = await useCases.options.execute(session);
      return { list, options };
    },
  );
  const today = currentDateInSaoPaulo();
  return (
    <div className="stack">
      <PageHeader
        hideDescriptionOnMobile
        title="Doações"
        icon="donation"
        description="Recebimentos destinados aos caixas."
        actions={
          result.ok ? (
            <DonationActions
              cashBoxes={result.value.options.cashBoxes}
              today={today}
            />
          ) : undefined
        }
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <>
          <SearchForm
            action="/doacoes"
            query={result.value.list.filters.query}
            label="Buscar por doador"
            filters={{
              ...(filters.cashBoxId ? { cashBoxId: filters.cashBoxId } : {}),
              ...(filters.year ? { year: filters.year } : {}),
            }}
            actions={
              <DonationFilters
                key={`${filters.cashBoxId}:${filters.year}:${result.value.list.filters.query}`}
                cashBoxes={result.value.options.cashBoxes}
                years={[
                  ...new Set([
                    Number(today.slice(0, 4)),
                    ...result.value.options.years,
                    ...(filters.year ? [Number(filters.year)] : []),
                  ]),
                ].sort((a, b) => b - a)}
                cashBoxId={filters.cashBoxId}
                year={filters.year}
                query={result.value.list.filters.query}
              />
            }
          />
          <DonationList
            items={result.value.list.items}
            cashBoxes={result.value.options.cashBoxes}
            today={today}
          />
          <Pagination
            basePath="/doacoes"
            query={result.value.list.filters.query}
            page={result.value.list.page}
            pageSize={result.value.list.pageSize}
            total={result.value.list.total}
            filters={{
              ...(filters.cashBoxId ? { cashBoxId: filters.cashBoxId } : {}),
              ...(filters.year ? { year: filters.year } : {}),
            }}
          />
        </>
      )}
    </div>
  );
}
