"use client";
import { SupplyReceipt } from "./supply-receipt";
import Link from "next/link";
import { Modal } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { ProductIcon } from "@/components/ui/product-icon";
import { formatCurrency } from "@/shared/formatting/currency";
import { formatDateTime } from "@/shared/formatting/date-time";
import type { SupplyListEntry } from "./supply-list";
export function SupplyDetailsModal({
  eventId,
  supply,
  onClose,
}: {
  eventId: string;
  supply: SupplyListEntry;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      title="Detalhes do insumo"
      onClose={onClose}
      footer={
        <Button variant="neutral" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <dl className="details">
        <div>
          <dt>Nome</dt>
          <dd className="inline">
            <ProductIcon name={supply.icon} />
            {supply.name}
          </dd>
        </div>
        <div>
          <dt>
            {supply.source === "purchase"
              ? "Valor da compra"
              : "Valor de referência"}
          </dt>
          <dd>{formatCurrency(supply.amountCents)}</dd>
        </div>
        <div>
          <dt>Origem</dt>
          <dd>
            {supply.cashBoxId ? (
              <Link className="text-link" href={`/caixas/${supply.cashBoxId}`}>
                {supply.cashBoxName}
              </Link>
            ) : (
              "Doação"
            )}
          </dd>
        </div>
        {supply.source === "donation" && (
          <div>
            <dt>Recebimento</dt>
            <dd>{supply.received ? "Recebido" : "Pendente"}</dd>
          </div>
        )}
        {supply.source === "donation" && (
          <div>
            <dt>Quem doou</dt>
            <dd>{supply.donorName || "Não informado"}</dd>
          </div>
        )}
        <div>
          <dt>Descrição</dt>
          <dd className="preserve-lines">
            {supply.description || "Não informada"}
          </dd>
        </div>
        <div>
          <dt>Comprovantes</dt>
          <dd>
            {supply.receipts.length ? (
              <div className="stack-small">
                {supply.receipts.map((receipt, index) => (
                  <SupplyReceipt
                    key={receipt.id}
                    eventId={eventId}
                    supplyId={supply.id}
                    name={supply.name}
                    type={receipt.type}
                    receiptId={receipt.id}
                    label={`${receipt.type === "application/pdf" ? "Baixar" : "Ver"} comprovante ${index + 1}`}
                  />
                ))}
              </div>
            ) : (
              "Não anexado"
            )}
          </dd>
        </div>
        <div>
          <dt>Cadastrado por</dt>
          <dd>
            {supply.createdByName} · {formatDateTime(supply.createdAt)}
          </dd>
        </div>
        {supply.version > 1 && (
          <div>
            <dt>Atualizado por</dt>
            <dd>
              {supply.updatedByName} · {formatDateTime(supply.updatedAt)}
            </dd>
          </div>
        )}
      </dl>
    </Modal>
  );
}
