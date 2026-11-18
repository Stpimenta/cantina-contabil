"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EventAudit } from "@/server/events/models/event-audit.model";
import type { EventPage } from "@/server/events/repositories/event.repository";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { HistoryRecordList } from "@/components/ui/history-record-list";
import { Pagination } from "@/components/ui/pagination";
import { EventAuditDetails } from "./event-audit-details";
function label(entry: EventAudit) {
  if (entry.resourceType === "stock" && entry.after.deletedAt)
    return "Entrada de estoque excluída";
  if (entry.resourceType === "stock")
    return entry.action === "create"
      ? "Entrada de estoque registrada"
      : "Entrada de estoque corrigida";
  if (
    entry.resourceType === "order" &&
    entry.action === "update" &&
    !entry.after.deletedAt &&
    JSON.stringify(entry.before?.withdrawals) !==
      JSON.stringify(entry.after.withdrawals)
  )
    return "Retirada registrada ou corrigida";
  const resource =
    entry.resourceType === "event"
      ? entry.after.kind === "product_category"
        ? "Grupo"
        : "Evento"
      : entry.resourceType === "supply"
        ? "Insumo"
        : "Pedido";
  return `${resource} ${entry.after.deletedAt ? "excluído" : entry.action === "create" ? "criado" : "atualizado"}`;
}
export function EventHistory({
  eventId,
  result,
  recurring = false,
}: {
  eventId: string;
  recurring?: boolean;
  result: EventPage<EventAudit> | null;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<EventAudit | null>(null);
  const open = !!params.get("history");
  const basePath = `${recurring ? "/products" : "/events"}/${eventId}`;
  function navigate(show: boolean) {
    if (pending) return;
    const next = new URLSearchParams(params.toString());
    if (show) {
      next.set("history", "1");
      next.delete("orders");
    } else next.delete("history");
    startTransition(() =>
      router.replace(`${basePath}${next.size ? `?${next}` : ""}`, {
        scroll: false,
      }),
    );
  }
  return (
    <>
      <Button
        size="large"
        compactOnMobile
        className="wide-action"
        variant="neutral"
        busy={pending}
        onClick={() => navigate(true)}
      >
        Histórico
      </Button>
      {open && result && (
        <Modal
          open
          title={recurring ? "Histórico do grupo" : "Histórico do evento"}
          onClose={() => navigate(false)}
          footer={
            <Button
              variant="neutral"
              disabled={pending}
              onClick={() => navigate(false)}
            >
              Fechar
            </Button>
          }
        >
          <HistoryRecordList
            label={recurring ? "Histórico do grupo" : "Histórico do evento"}
            disabled={pending}
            entries={result.items.map((entry) => ({
              id: entry.id,
              label: label(entry),
              actorName: entry.actorName,
            }))}
            onDetails={(id) =>
              setSelected(result.items.find((entry) => entry.id === id) ?? null)
            }
          />
          <Pagination
            basePath={basePath}
            pageKey="history"
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            scroll={false}
            filters={{ ...Object.fromEntries(params.entries()), history: "1" }}
          />
        </Modal>
      )}
      {open && selected && (
        <Modal
          open
          title={label(selected)}
          onClose={() => setSelected(null)}
          footer={
            <Button variant="neutral" onClick={() => setSelected(null)}>
              Fechar
            </Button>
          }
        >
          <EventAuditDetails entry={selected} />
        </Modal>
      )}
    </>
  );
}
