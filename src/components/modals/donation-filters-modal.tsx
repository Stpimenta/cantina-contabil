"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { Button } from "../ui/button";
import { SelectField } from "../ui/select-field";

export function DonationFiltersModal({
  cashBoxes,
  years,
  cashBoxId,
  year,
  query,
  onClose,
}: {
  cashBoxes: { id: string; name: string }[];
  years: number[];
  cashBoxId: string;
  year: string;
  query: string;
  onClose: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [selectedBox, setSelectedBox] = useState(cashBoxId);
  const [selectedYear, setSelectedYear] = useState(year);
  const [pending, startTransition] = useTransition();
  const wasPending = useRef(false);
  useEffect(() => {
    if (pending) wasPending.current = true;
    else if (wasPending.current) onClose();
  }, [pending, onClose]);

  return (
    <Modal
      open
      title="Filtros de doações"
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
          if (selectedBox === cashBoxId && selectedYear === year) {
            onClose();
            return;
          }
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (selectedBox) params.set("cashBoxId", selectedBox);
          if (selectedYear) params.set("year", selectedYear);
          startTransition(() =>
            router.push(`/doacoes${params.size ? `?${params}` : ""}`, {
              scroll: false,
            }),
          );
        }}
      >
        <SelectField
          id={`${id}-box`}
          label="Caixa"
          name="cashBoxId"
          value={selectedBox}
          disabled={pending}
          onValueChange={setSelectedBox}
          options={[
            { value: "", label: "Todos os caixas" },
            ...cashBoxes.map((box) => ({ value: box.id, label: box.name })),
          ]}
        />
        <SelectField
          id={`${id}-year`}
          label="Ano"
          name="year"
          value={selectedYear}
          disabled={pending}
          onValueChange={setSelectedYear}
          options={[
            { value: "", label: "Todos os anos" },
            ...years.map((value) => ({
              value: String(value),
              label: String(value),
            })),
          ]}
        />
        <span className="sr-only" role="status">
          {pending ? "Atualizando filtros" : ""}
        </span>
      </form>
    </Modal>
  );
}
