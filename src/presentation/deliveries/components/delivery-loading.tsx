import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./deliveries.module.css";
export function DeliveryLoading({
  restricted = false,
}: {
  restricted?: boolean;
}) {
  return (
    <section
      className={restricted ? `${styles.shell} stack` : "stack"}
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Carregando rotas de entrega
      </span>
      {!restricted && (
        <Breadcrumbs
          loading
          items={[
            { label: "Eventos", href: "/events" },
            { label: "Evento" },
            { label: "Rotas de entrega" },
          ]}
        />
      )}
      <PageHeader
        icon="calendar"
        title={restricted ? "Minhas entregas" : "Rotas de entrega"}
        description={<Skeleton />}
        actions={
          restricted ? (
            <Button variant="neutral" disabled>
              Atualizar rotas
            </Button>
          ) : undefined
        }
      />
      {!restricted && (
        <div className={styles.controls}>
          {[
            "Montar rota",
            "Ponto de saída e equipe",
            "Entregadores",
            "Gerenciar acessos",
          ].map((text, i) => (
            <Button key={text} variant={i ? "neutral" : "primary"} disabled>
              {text}
            </Button>
          ))}
        </div>
      )}
      <section className="stack-small">
        <h2>Ponto de saída</h2>
        <Skeleton />
      </section>
      <section className={styles.section} aria-hidden="true">
        <div className={styles.row}>
          <div className={styles.content}>
            <Skeleton shape="title" />
            <Skeleton shape="short" />
          </div>
        </div>
        <div className={styles.stop}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Button disabled>Marcar entregue</Button>
        </div>
      </section>
    </section>
  );
}
