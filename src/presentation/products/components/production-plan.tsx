"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/modals/modal";
import { ErrorModal } from "@/components/modals/error-modal";
import { SelectField } from "@/components/ui/select-field";
import { SectionFeedback } from "@/components/ui/section-feedback";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { loadProductionPlanAction } from "@/server/products/actions/load-production-plan.action";
import type { ProductionPlanItem } from "@/server/products/models/production-plan.model";
import type { OrderPeriod } from "@/server/events/inputs/event-query.input";
import { SharedStockIndicator } from "./shared-stock-indicator";
import styles from "./production-plan.module.css";

const periods = [
  { value: "all", label: "Todos" },
  { value: "week", label: "Próxima semana (hoje até domingo)" },
  { value: "month", label: "Próximo mês (hoje até 30 dias)" },
];
export function ProductionPlan({ eventId }: { eventId: string }) {
  const id = useId();
  const [items, setItems] = useState<ProductionPlanItem[] | null>(null);
  const [scenario, setScenario] = useState("all");
  const [period, setPeriod] = useState<OrderPeriod>("all");
  const load = useServerAction({
    connectionMessage:
      "Não foi possível consultar os produtos. Tente novamente.",
  });
  function fetchPlan(value: OrderPeriod) {
    if (load.isPending()) return;
    load.execute(
      () => loadProductionPlanAction(eventId, value),
      (result) => {
        setItems(result);
        setPeriod(value);
      },
    );
  }
  const scenarioOptions = [
    { value: "all", label: "Consolidado" },
    { value: "exclusive", label: "Exclusivos do grupo" },
  ];
  const activeScenario = scenario;
  const visibleItems = (items ?? []).filter(
    (item) => activeScenario === "all" || !item.scenarios,
  );
  const groups = [
    {
      label: "Produtos vinculados",
      items: visibleItems.filter((item) => item.scenarios),
    },
    {
      label: "Produtos sem vínculo",
      items: visibleItems.filter((item) => !item.scenarios),
    },
  ].filter((group) => group.items.length > 0);
  return (
    <>
      <Button
        variant="neutral"
        mobileIcon={<Icon name="more" />}
        iconBreakpoint="tablet"
        aria-label="Detalhes de produtos e estoque"
        aria-haspopup="dialog"
        aria-expanded={items !== null}
        busy={load.pending}
        onClick={() => {
          setScenario("all");
          fetchPlan("all");
        }}
      >
        Detalhes
      </Button>
      {items && (
        <Modal
          open
          size="formCompact"
          title="Produtos e estoque"
          onClose={() => {
            if (!load.isPending()) setItems(null);
          }}
          footer={
            <Button
              variant="neutral"
              disabled={load.pending}
              onClick={() => setItems(null)}
            >
              Fechar
            </Button>
          }
        >
          <div className={styles.content}>
            <div className={styles.filters}>
              <SelectField
                id={`${id}-period`}
                label="Data de entrega"
                value={period}
                disabled={load.pending}
                options={periods}
                onValueChange={(value) => fetchPlan(value as OrderPeriod)}
              />
              {scenarioOptions.length > 1 && (
                <SelectField
                  id={`${id}-scenario`}
                  label="Produtos"
                  value={activeScenario}
                  options={scenarioOptions}
                  disabled={load.pending}
                  onValueChange={setScenario}
                />
              )}
            </div>
            {!visibleItems.length ? (
              <SectionFeedback area="pedidos">
                {activeScenario === "exclusive"
                  ? "Nenhum produto exclusivo deste grupo."
                  : "Nenhum produto para consultar."}
              </SectionFeedback>
            ) : (
              groups.map((group) => (
                <section
                  key={group.label}
                  className={styles.group}
                  aria-label={group.label}
                >
                  {activeScenario === "all" &&
                    items.some((item) => item.scenarios) && (
                      <p className={`muted record-meta ${styles.groupTitle}`}>
                        {group.label}
                      </p>
                    )}
                  <ul className="record-list">
                    {group.items.map((item) => (
                      <ProductionPlanRow key={item.productId} item={item} />
                    ))}
                  </ul>
                </section>
              ))
            )}
            <span className="sr-only" role="status">
              {load.pending ? "Atualizando produtos e estoque" : ""}
            </span>
          </div>
        </Modal>
      )}
      <ErrorModal error={load.error} onClose={load.closeError} />
    </>
  );
}

function ProductionPlanRow({ item }: { item: ProductionPlanItem }) {
  return (
    <li className={styles.product}>
      <h3 className={styles.name}>
        <span>{item.name}</span>
        {item.scenarios && <SharedStockIndicator />}
      </h3>
      <dl className={styles.quantities}>
        <div>
          <dt>A entregar/retirar</dt>
          <dd>{item.pending.toLocaleString("pt-BR")} un.</dd>
        </div>
        <div>
          <dt>Estoque físico{item.scenarios ? " compartilhado" : ""}</dt>
          <dd>{item.physical.toLocaleString("pt-BR")} un.</dd>
        </div>
        <div className={styles.required}>
          <dt>Falta produzir</dt>
          <dd>{item.toProduce.toLocaleString("pt-BR")} un.</dd>
        </div>
      </dl>
    </li>
  );
}
