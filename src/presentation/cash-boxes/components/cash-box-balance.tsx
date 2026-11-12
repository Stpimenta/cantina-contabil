import { BalanceAmount } from "@/components/ui/balance-visibility";
import styles from "./cash-box-balance.module.css";
import { formatCurrency } from "@/shared/formatting/currency";

export function CashBoxBalance({
  amountCents,
  prominent = false,
  concealable = false,
  pendingCents = 0,
}: {
  amountCents: number;
  prominent?: boolean;
  concealable?: boolean;
  pendingCents?: number;
}) {
  return (
    <div className={styles.root}>
      <div className="stack-small">
        <p className="muted record-meta">Real</p>
        <p
          className={`balance-value${prominent ? ` ${styles.prominent}` : ""}`}
        >
          {concealable ? (
            <BalanceAmount cents={amountCents} />
          ) : (
            formatCurrency(amountCents)
          )}
        </p>
      </div>
      <div className="stack-small">
        <p className="muted record-meta">Pendente</p>
        <p className="balance-value">
          {concealable ? (
            <BalanceAmount cents={pendingCents} />
          ) : (
            formatCurrency(pendingCents)
          )}
        </p>
      </div>
    </div>
  );
}
