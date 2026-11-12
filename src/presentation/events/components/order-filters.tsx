"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import type {
  OrderStatus,
  OrderFulfillmentFilter,
} from "@/server/events/inputs/event-query.input";

export function OrderFilters({
  basePath,
  status,
  fulfillment,
  deliveryEnabled,
  query,
}: {
  basePath: string;
  status: OrderStatus;
  fulfillment: OrderFulfillmentFilter;
  deliveryEnabled: boolean;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  const count =
    Number(status !== "all") + Number(deliveryEnabled && fulfillment !== "all");
  return (
    <>
      <Button
        variant="neutral"
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
  fulfillment,
  deliveryEnabled,
  query,
  onClose,
}: {
  basePath: string;
  status: OrderStatus;
  fulfillment: OrderFulfillmentFilter;
  deliveryEnabled: boolean;
  query: string;
  onClose: () => void;
}) {
  const id = useId();
  const router = useRouter();
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
          if (selected === status && selectedFulfillment === fulfillment) {
            onClose();
            return;
          }
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (selected !== "all") params.set("status", selected);
          if (deliveryEnabled && selectedFulfillment !== "all")
            params.set("fulfillment", selectedFulfillment);
          startTransition(() =>
            router.push(`${basePath}${params.size ? `?${params}` : ""}`, {
              scroll: false,
            }),
          );
        }}
      >
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
        {deliveryEnabled && (
          <SelectField
            id={`${id}-fulfillment`}
            label="Entrega ou retirada"
            value={selectedFulfillment}
            disabled={pending}
            onValueChange={(value) =>
              setSelectedFulfillment(value as OrderFulfillmentFilter)
            }
            options={[
              { value: "all", label: "Todas" },
              { value: "pending", label: "Não concluídas" },
            ]}
          />
        )}
        <span className="sr-only" role="status">
          {pending ? "Atualizando filtros" : ""}
        </span>
      </form>
    </Modal>
  );
}
