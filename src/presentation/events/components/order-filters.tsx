"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import styles from "./order-filters.module.css";
import type {
  OrderStatus,
  OrderPeriod,
  OrderFulfillmentFilter,
} from "@/server/events/inputs/event-query.input";

export function OrderFilters({
  basePath,
  status,
  period,
  fulfillment,
  deliveryEnabled,
  query,
}: {
  basePath: string;
  status: OrderStatus;
  period: OrderPeriod;
  fulfillment: OrderFulfillmentFilter;
  deliveryEnabled: boolean;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  const count =
    Number(status !== "all") +
    Number(fulfillment !== "all") +
    Number(period !== "all");
  return (
    <>
      <Button
        variant="neutral"
        className={styles.trigger}
        mobileIcon={<Icon name="filter" />}
        data-active={count > 0 || undefined}
        title="Filtros"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          count
            ? `Filtros: ${count} ${count === 1 ? "ativo" : "ativos"}`
            : "Filtros"
        }
        onClick={() => setOpen(true)}
      >
        <Icon name="filter" />
        Filtros{count ? ` (${count})` : ""}
      </Button>
      {open && (
        <OrderFiltersModal
          basePath={basePath}
          status={status}
          period={period}
          fulfillment={fulfillment}
          deliveryEnabled={deliveryEnabled}
          query={query}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function OrderFiltersModal({
  basePath,
  status,
  period,
  fulfillment,
  deliveryEnabled,
  query,
  onClose,
}: {
  basePath: string;
  status: OrderStatus;
  period: OrderPeriod;
  fulfillment: OrderFulfillmentFilter;
  deliveryEnabled: boolean;
  query: string;
  onClose: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selected, setSelected] = useState(status);
  const [selectedFulfillment, setSelectedFulfillment] = useState(fulfillment);
  const [pending, startTransition] = useTransition();
  const wasPending = useRef(false);
  useEffect(() => {
    if (pending) wasPending.current = true;
    else if (wasPending.current) onClose();
  }, [pending, onClose]);
  return (
    <Modal
      open
      title="Filtros de pedidos"
      onClose={() => {
        if (!pending) onClose();
      }}
      footer={
        <>
          <Button variant="neutral" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={id} busy={pending}>
            Aplicar filtros
          </Button>
        </>
      }
    >
      <form
        id={id}
        className="stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          if (
            selected === status &&
            selectedFulfillment === fulfillment &&
            selectedPeriod === period
          ) {
            onClose();
            return;
          }
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (selected !== "all") params.set("status", selected);
          if (selectedPeriod !== "all") params.set("period", selectedPeriod);
          if (selectedFulfillment !== "all")
            params.set("fulfillment", selectedFulfillment);
          startTransition(() =>
            router.push(`${basePath}${params.size ? `?${params}` : ""}`, {
              scroll: false,
            }),
          );
        }}
      >
        <SelectField
          id={`${id}-period`}
          label="Data de entrega"
          value={selectedPeriod}
          disabled={pending}
          onValueChange={(value) => setSelectedPeriod(value as OrderPeriod)}
          options={[
            { value: "all", label: "Todos" },
            { value: "week", label: "Próxima semana (hoje até domingo)" },
            { value: "month", label: "Próximo mês (hoje até 30 dias)" },
          ]}
        />
        <SelectField
          id={`${id}-status`}
          label="Pagamento"
          value={selected}
          disabled={pending}
          onValueChange={(value) => setSelected(value as OrderStatus)}
          options={[
            { value: "all", label: "Todos" },
            { value: "pending", label: "Pendentes" },
            { value: "paid", label: "Pagos" },
          ]}
        />
        <SelectField
          id={`${id}-fulfillment`}
          label={deliveryEnabled ? "Entrega ou retirada" : "Retirada"}
          value={selectedFulfillment}
          disabled={pending}
          onValueChange={(value) =>
            setSelectedFulfillment(value as OrderFulfillmentFilter)
          }
          options={[
            { value: "all", label: "Todas" },
            {
              value: "pending",
              label: deliveryEnabled
                ? "Entrega ou retirada pendente"
                : "Retirada pendente",
            },
            {
              value: "completed",
              label: deliveryEnabled ? "Entregues ou retirados" : "Retirados",
            },
          ]}
        />
        <span className="sr-only" role="status">
          {pending ? "Atualizando filtros" : ""}
        </span>
      </form>
    </Modal>
  );
}
