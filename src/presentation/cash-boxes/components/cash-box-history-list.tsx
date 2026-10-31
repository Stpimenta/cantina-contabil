"use client";

import { useState } from "react";
import type { CashBoxHistoryEntry } from "@/server/cash-boxes/models/cash-box-history-entry.model";
import { CashBoxHistoryEntryModal } from "@/components/modals/cash-box-history-entry-modal";
import { HistoryRecordList } from "@/components/ui/history-record-list";

const labels: Record<CashBoxHistoryEntry["action"], string> = {
  movement_create: "Movimentação registrada",
  movement_update: "Movimentação atualizada",
  movement_delete: "Movimentação excluída",
  supply_create: "Insumo comprado",
  supply_delete: "Insumo excluído",
  supply_update: "Insumo atualizado",
  donation: "Doação recebida",
  donation_update: "Doação atualizada",
  donation_delete: "Doação excluída",
  event_create: "Evento criado",
  event_delete: "Evento excluído",
  event_update: "Evento atualizado",
  order_create: "Pedido criado",
  order_delete: "Pedido excluído",
  order_update: "Pedido atualizado",
  create: "Caixa criado",
  update: "Caixa atualizado",
  delete: "Caixa excluído",
};

export function CashBoxHistoryList({
  entries,
}: {
  entries: CashBoxHistoryEntry[];
}) {
  const [selected, setSelected] = useState<CashBoxHistoryEntry | null>(null);
  return (
    <>
      <HistoryRecordList
        label="Eventos do caixa"
        entries={entries.map((entry) => ({
          id: entry.id,
          label: labels[entry.action],
          actorName: entry.actorName,
        }))}
        onDetails={(id) =>
          setSelected(entries.find((entry) => entry.id === id) ?? null)
        }
      />
      {selected && (
        <CashBoxHistoryEntryModal
          entry={selected}
          actionLabel={labels[selected.action]}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
