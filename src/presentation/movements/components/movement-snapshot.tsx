import { formatCurrency } from "@/shared/formatting/currency";
import { formatDateOnly } from "@/shared/formatting/date-time";
export function MovementSnapshot({
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
        <dt>Tipo</dt>
        <dd>{value.direction === "incoming" ? "Entrada" : "Saída"}</dd>
      </div>
      <div>
        <dt>Valor</dt>
        <dd className="balance-value">
          {formatCurrency(Number(value.amountCents))}
        </dd>
      </div>
      <div>
        <dt>Data</dt>
        <dd>{formatDateOnly(String(value.occurredOn))}</dd>
      </div>
      <div>
        <dt>Justificativa</dt>
        <dd className="preserve-lines">{String(value.reason ?? "")}</dd>
      </div>
      {typeof value.receiptCount === "number" && (
        <div>
          <dt>Comprovantes</dt>
          <dd>{value.receiptCount} arquivo(s)</dd>
        </div>
      )}
    </dl>
  );
}
