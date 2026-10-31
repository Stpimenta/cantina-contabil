import { ProductIcon } from "@/components/ui/product-icon";
import { productIcons } from "@/shared/products/product-icons";
import type { EventAudit } from "@/server/events/models/event-audit.model";
import { formatCurrency } from "@/shared/formatting/currency";
import { formatDateOnly, formatDateTime } from "@/shared/formatting/date-time";
import type { EventProduct } from "@/server/events/models/event-product.model";
import type { OrderItem } from "@/server/events/models/order-item.model";
function Snapshot({
  value,
  type,
}: {
  value: Record<string, unknown>;
  type: "event" | "order" | "supply";
}) {
  if (type === "supply")
    return (
      <dl className="details">
        {!!value.deletedAt && (
          <div>
            <dt>Situação</dt>
            <dd>Excluído</dd>
          </div>
        )}
        <div>
          <dt>Insumo</dt>
          <dd className="inline">
            <ProductIcon
              name={
                productIcons.find((icon) => icon.id === value.icon)?.id ?? "bag"
              }
            />
            <span>{String(value.name ?? "")}</span>
          </dd>
        </div>
        <div>
          <dt>Descrição</dt>
          <dd className="preserve-lines">
            {String(value.description || "Não informada")}
          </dd>
        </div>
        <div>
          <dt>Valor{value.source === "donation" ? " de referência" : ""}</dt>
          <dd>{formatCurrency(Number(value.amountCents))}</dd>
        </div>
        {value.receiptType !== undefined && (
          <div>
            <dt>Comprovantes</dt>
            <dd>
              {typeof value.receiptCount === "number"
                ? `${value.receiptCount} arquivo(s)`
                : value.receiptType
                  ? value.receiptType === "application/pdf"
                    ? "PDF anexado"
                    : "Imagem anexada"
                  : "Não anexado"}
            </dd>
          </div>
        )}
        {value.source === "donation" && (
          <div>
            <dt>Quem doou</dt>
            <dd>{String(value.donorName || "Não informado")}</dd>
          </div>
        )}
        <div>
          <dt>Origem</dt>
          <dd>{value.source === "purchase" ? "Compra" : "Doação"}</dd>
        </div>
        {value.source === "purchase" ? (
          <div>
            <dt>Caixa de origem</dt>
            <dd>{String(value.cashBoxName ?? "")}</dd>
          </div>
        ) : (
          <div>
            <dt>Recebimento</dt>
            <dd>{value.received ? "Recebido" : "Pendente"}</dd>
          </div>
        )}
      </dl>
    );
  const products = (type === "event" ? value.products : value.items) as (
    EventProduct | OrderItem
  )[];
  return (
    <dl className="details">
      {!!value.deletedAt && (
        <div>
          <dt>Situação</dt>
          <dd>Excluído</dd>
        </div>
      )}
      {type === "event" ? (
        <>
          <div>
            <dt>Nome do evento</dt>
            <dd>{String(value.name ?? "")}</dd>
          </div>
          <div>
            <dt>Descrição</dt>
            <dd className="preserve-lines">
              {String(value.description || "Não informada")}
            </dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{formatDateOnly(String(value.occursOn))}</dd>
          </div>
        </>
      ) : (
        <>
          <div>
            <dt>Pessoa</dt>
            <dd>{String(value.customerName ?? "")}</dd>
          </div>
          <div>
            <dt>Valor do pedido</dt>
            <dd>{formatCurrency(Number(value.totalCents))}</dd>
          </div>
          <div>
            <dt>Pagamento</dt>
            <dd>{value.paid ? "Pago" : "Pendente"}</dd>
          </div>
          {!!value.paid && (
            <>
              <div>
                <dt>Dinheiro</dt>
                <dd>{formatCurrency(Number(value.cashCents))}</dd>
              </div>
              <div>
                <dt>Pix</dt>
                <dd>{formatCurrency(Number(value.pixCents))}</dd>
              </div>
            </>
          )}
          <div>
            <dt>Observação</dt>
            <dd className="preserve-lines">
              {String(value.note || "Não informada")}
            </dd>
          </div>
        </>
      )}
      <div>
        <dt>Produtos</dt>
        <dd>
          <ul className="record-list">
            {products?.map((p) => (
              <li key={p.id} className="record-row">
                <span>
                  {"quantity" in p ? `${p.quantity} × ` : ""}
                  {p.name}
                </span>
                <span>{formatCurrency(p.priceCents)} por unidade</span>
              </li>
            ))}
          </ul>
        </dd>
      </div>
    </dl>
  );
}
export function EventAuditDetails({
  entry,
}: {
  entry: Pick<
    EventAudit,
    "actorName" | "occurredAt" | "resourceType" | "before" | "after"
  >;
}) {
  return (
    <div className="stack">
      <dl className="details">
        <div>
          <dt>Registrado por</dt>
          <dd>{entry.actorName}</dd>
        </div>
        <div>
          <dt>Data do registro</dt>
          <dd>{formatDateTime(entry.occurredAt)}</dd>
        </div>
      </dl>
      {entry.before && (
        <section className="stack">
          <h2>Antes</h2>
          <Snapshot value={entry.before} type={entry.resourceType} />
        </section>
      )}
      <section className="stack">
        <h2>{entry.before ? "Depois" : "Dados registrados"}</h2>
        <Snapshot value={entry.after} type={entry.resourceType} />
      </section>
    </div>
  );
}
