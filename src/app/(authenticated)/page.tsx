import styles from "./page.module.css";
import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createHome } from "@/server/home/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageHeader } from "@/components/layout/page-header";
import { PageFailure } from "@/components/ui/page-failure";
import { HomeOverview } from "@/presentation/home/components/home-overview";

export default async function HomePage() {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  const result = await executeOperation(
    {
      operation: "home.get",
      message:
        "Não foi possível carregar o resumo. Tente novamente em instantes.",
      source: "src/app/(authenticated)/page.tsx",
      route: "/",
      method: "GET",
      context: { actorId: session.user.id },
    },
    () => createHome().execute(session),
  );
  return (
    <div className={styles.page}>
      <PageHeader
        hideDescriptionOnMobile
        title={`Olá, ${session.user.name.trim().split(/\s+/)[0]}.`}
        icon="home"
        description="Seu resumo no Ministério Contábil."
      />
      {!result.ok ? (
        <PageFailure error={result.error} />
      ) : (
        <HomeOverview data={result.value} />
      )}
    </div>
  );
}
