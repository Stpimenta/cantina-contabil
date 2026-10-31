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
const label = (entry: EventAudit) =>
  `${entry.resourceType === "event" ? "Evento" : entry.resourceType === "supply" ? "Insumo" : "Pedido"} ${entry.after.deletedAt ? "excluído" : entry.action === "create" ? "criado" : "atualizado"}`;
export function EventHistory({
  eventId,
  result,
}: {
  eventId: string;
  result: EventPage<EventAudit> | null;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<EventAudit | null>(null);
  const open = !!params.get("history");
  const basePath = `/eventos/${eventId}`;
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
          title="Histórico do evento"
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
            label="Histórico do evento"
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
