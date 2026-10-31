import { formatCurrency } from "@/shared/formatting/currency";
import { formatDateOnly } from "@/shared/formatting/date-time";
export function DonationSnapshot({
  value,
}: {
  value: Record<string, unknown>;
}) {
  return (
    <dl className="details">
      <div>
        <dt>Caixa</dt>
        <dd>{String(value.cashBoxName ?? "")}</dd>
      </div>
      <div>
        <dt>Valor</dt>
        <dd className="balance-value">
          {formatCurrency(Number(value.amountCents))}
        </dd>
      </div>
      <div>
        <dt>Data da doação</dt>
        <dd>{formatDateOnly(String(value.donatedOn))}</dd>
      </div>
      <div>
        <dt>Doador</dt>
        <dd className="preserve-lines">
          {String(value.donorName || "Não informado")}
        </dd>
      </div>
      <div>
        <dt>Observação</dt>
        <dd className="preserve-lines">
          {String(value.note || "Não informada")}
        </dd>
      </div>
    </dl>
  );
}
