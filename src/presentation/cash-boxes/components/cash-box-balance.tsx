import styles from "./cash-box-balance.module.css";
import { formatCurrency } from "@/shared/formatting/currency";

export function CashBoxBalance({
  amountCents,
  prominent = false,
  pendingCents = 0,
}: {
  amountCents: number;
  prominent?: boolean;
  pendingCents?: number;
}) {
  return (
    <div className={styles.root}>
      <div className="stack-small">
        <p className="muted record-meta">Real</p>
        <p className={`balance-value${prominent ? ` ${styles.prominent}` : ""}`}>
          {formatCurrency(amountCents)}
        </p>
      </div>
      <div className="stack-small">
        <p className="muted record-meta">Pendente</p>
        <p className="balance-value">{formatCurrency(pendingCents)}</p>
      </div>
    </div>
  );
}
