import styles from "@/presentation/canteen/components/command-board.module.css";
import { createCanteen } from "@/server/canteen/composition";
import { commandIdentity } from "@/server/canteen/infrastructure/http-identity";
import { executeOperation } from "@/shared/errors/execute-operation";
import { throwBusinessError } from "@/shared/errors/business-error";
import { PageFailure } from "@/components/ui/page-failure";
import { PageHeader } from "@/components/layout/page-header";
import { CommandBoard } from "@/presentation/canteen/components/command-board";
export const metadata = { title: "Comandas", referrer: "no-referrer" as const };
export default async function TabletCommands({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string; collected?: string }>;
}) {
  const { id } = await params,
    q = await searchParams;
  const result = await executeOperation(
    {
      operation: "canteen.tablet",
      message: "Não foi possível carregar as comandas.",
      source: "src/app/comandas/[id]/page.tsx",
      route: "/comandas/[id]",
      method: "GET",
    },
    async () => {
      const identity = await commandIdentity();
      if (identity.kind !== "access")
        throwBusinessError({
          code: "TEMP_ACCESS_ENDED",
          category: "unauthenticated",
        });
      return createCanteen().list.execute(identity, id, {
        ...q,
        q: q.q ?? "",
        page: q.page ?? 1,
        collected: q.collected ?? "waiting",
      });
    },
  );
  return (
    <main className={`${styles.shell} stack`}>
      <PageHeader
        icon="calendar"
        title="Comandas"
        description={
          result.ok
            ? `Evento: ${result.value.eventName}`
            : "Acesso temporário às comandas"
        }
      />
      {result.ok ? (
        <CommandBoard initial={result.value} basePath={`/comandas/${id}`} />
      ) : (
        <PageFailure error={result.error} />
      )}
    </main>
  );
}
