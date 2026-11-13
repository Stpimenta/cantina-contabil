import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageHeader } from "@/components/layout/page-header";
import { SearchForm } from "@/components/ui/search-form";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import styles from "./command-board.module.css";
export function CommandLoading({
  restricted = false,
}: {
  restricted?: boolean;
}) {
  return (
    <section className={styles.page} aria-busy="true" aria-label="Comandas">
      <span className="sr-only" role="status">
        Carregando comandas
      </span>
      {!restricted && (
        <Breadcrumbs
          loading
          items={[
            { label: "Home", href: "/" },
            { label: "Eventos", href: "/events" },
            { label: "Evento" },
            { label: "Comandas" },
          ]}
        />
      )}
      <PageHeader icon="calendar" title="Comandas" description={<Skeleton />} />
      <div className={styles.page}>
        <span className="sr-only">Sincronização pendente</span>
        <SearchForm
          action="/events"
          label="Buscar pelo nome"
          query=""
          disabled
        />
        <SelectField
          id="command-status-loading"
          label="Situação"
          value="waiting"
          options={[{ value: "waiting", label: "Aguardando retirada" }]}
          onValueChange={() => {}}
          disabled
        />
        <ul className="record-list" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="record-row">
              <div className={styles.content}>
                <Skeleton />
                <Skeleton shape="short" />
                <Skeleton />
              </div>
              <Button variant="neutral" disabled>
                Marcar retirado
              </Button>
            </li>
          ))}
        </ul>
      </div>
      {!restricted && (
        <section className="stack">
          <div className="spread-row">
            <h2>Acessos temporários</h2>
            <Button variant="neutral" disabled>
              Criar acesso
            </Button>
          </div>
          <Skeleton />
        </section>
      )}
    </section>
  );
}
