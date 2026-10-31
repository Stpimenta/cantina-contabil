"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import type { OrderStatus } from "@/server/events/inputs/event-query.input";

export function OrderFilters({
  basePath,
  status,
  query,
}: {
  basePath: string;
  status: OrderStatus;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="neutral"
        title="Filtros"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={status === "all" ? "Filtros" : "Filtros: 1 ativo"}
        onClick={() => setOpen(true)}
      >
        <Icon name="filter" />
        Filtros{status !== "all" ? " (1)" : ""}
      </Button>
      {open && (
        <OrderFiltersModal
          basePath={basePath}
          status={status}
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
  query,
  onClose,
}: {
  basePath: string;
  status: OrderStatus;
  query: string;
  onClose: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [selected, setSelected] = useState(status);
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
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          if (selected === status) {
            onClose();
            return;
          }
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (selected !== "all") params.set("status", selected);
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
        <span className="sr-only" role="status">
          {pending ? "Atualizando filtros" : ""}
        </span>
      </form>
    </Modal>
  );
}
