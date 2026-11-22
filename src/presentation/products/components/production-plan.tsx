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
import styles from "./production-plan.module.css";

const periods = [
  { value: "all", label: "Todos" },
  { value: "week", label: "Próxima semana (hoje até domingo)" },
  { value: "month", label: "Próximo mês (hoje até 30 dias)" },
];
export function ProductionPlan({ eventId }: { eventId: string }) {
  const id = useId();
  const [items, setItems] = useState<ProductionPlanItem[] | null>(null);
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
        onClick={() => fetchPlan("all")}
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
                label="Previsão de entrega ou retirada"
                value={period}
                disabled={load.pending}
                options={periods}
                onValueChange={(value) => fetchPlan(value as OrderPeriod)}
              />
            </div>
            {!items.length ? (
              <SectionFeedback area="pedidos">
                Nenhum produto para consultar.
              </SectionFeedback>
            ) : (
              <ul className="record-list">
                {items.map((item) => (
                  <li key={item.productId} className={styles.product}>
                    <h3 className={styles.name}>{item.name}</h3>
                    <dl className={styles.quantities}>
                      <div>
                        <dt>A entregar/retirar</dt>
                        <dd>{item.pending.toLocaleString("pt-BR")} un.</dd>
                      </div>
                      <div>
                        <dt>Estoque físico</dt>
                        <dd>{item.physical.toLocaleString("pt-BR")} un.</dd>
                      </div>
                      <div className={styles.required}>
                        <dt>Falta produzir</dt>
                        <dd>{item.toProduce.toLocaleString("pt-BR")} un.</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
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
