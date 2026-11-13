import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createCanteen } from "@/server/canteen/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageFailure } from "@/components/ui/page-failure";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CommandBoard } from "@/presentation/canteen/components/command-board";
import { TemporaryAccesses } from "@/presentation/canteen/components/temporary-accesses";
export const metadata = { title: "Comandas" };
export default async function CommandsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string; collected?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const { id } = await params,
    q = await searchParams;
  const result = await executeOperation(
    {
      operation: "canteen.page",
      message: "Não foi possível carregar as comandas.",
      source: "src/app/(authenticated)/events/[id]/commands/page.tsx",
      route: "/events/[id]/commands",
      method: "GET",
    },
    async () => {
      const c = createCanteen();
      return {
        commands: await c.list.execute({ kind: "user", session }, id, {
          ...q,
          q: q.q ?? "",
          page: q.page ?? 1,
          collected: q.collected ?? "waiting",
        }),
        accesses: await c.accesses.execute(session, id),
      };
    },
  );
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Eventos", href: "/events" },
          {
            label: result.ok ? result.value.commands.eventName : "Evento",
            href: `/events/${id}`,
          },
          { label: "Comandas" },
        ]}
      />
      <PageHeader
        icon="calendar"
        title="Comandas"
        description={
          result.ok
            ? `Evento: ${result.value.commands.eventName}`
            : "Comandas do evento"
        }
      />
      {result.ok ? (
        <>
          <CommandBoard
            initial={result.value.commands}
            basePath={`/events/${id}/commands`}
          />
          <TemporaryAccesses eventId={id} accesses={result.value.accesses} />
        </>
      ) : (
        <PageFailure error={result.error} />
      )}
    </div>
  );
}
