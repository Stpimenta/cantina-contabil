"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CommandFilter } from "@/server/canteen/models/command.model";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
export function CommandFilters({
  basePath,
  collected,
  query,
}: {
  basePath: string;
  collected: CommandFilter;
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
        aria-label={collected !== "all" ? "Filtros: 1 ativo" : "Filtros"}
        onClick={() => setOpen(true)}
      >
        <Icon name="filter" />
        Filtros{collected !== "all" ? " (1)" : ""}
      </Button>
      {open && (
        <CommandFiltersModal
          basePath={basePath}
          collected={collected}
          query={query}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
function CommandFiltersModal({
  basePath,
  collected,
  query,
  onClose,
}: {
  basePath: string;
  collected: CommandFilter;
  query: string;
  onClose: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [selected, setSelected] = useState<CommandFilter>(collected);
  const [pending, startTransition] = useTransition();
  const wasPending = useRef(false);
  useEffect(() => {
    if (pending) wasPending.current = true;
    else if (wasPending.current) onClose();
  }, [pending, onClose]);
  return (
    <Modal
      open
      title="Filtros de comandas"
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
          if (selected === collected) {
            onClose();
            return;
          }
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (selected !== "all") params.set("collected", selected);
          startTransition(() =>
            router.push(`${basePath}${params.size ? `?${params}` : ""}`, {
              scroll: false,
            }),
          );
        }}
      >
        <SelectField
          id={`${id}-status`}
          label="Situação"
          value={selected}
          disabled={pending}
          onValueChange={(value) => setSelected(value as CommandFilter)}
          options={[
            { value: "all", label: "Todos" },
            { value: "waiting", label: "A retirar" },
            { value: "collected", label: "Retirados" },
          ]}
        />
        <span className="sr-only" role="status">
          {pending ? "Atualizando filtros" : ""}
        </span>
      </form>
    </Modal>
  );
}
