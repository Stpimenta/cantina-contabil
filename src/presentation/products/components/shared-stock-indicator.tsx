import { Icon } from "@/components/ui/icon";
import styles from "./shared-stock-indicator.module.css";
export function SharedStockIndicator({
  pending = false,
}: {
  pending?: boolean;
}) {
  const label = pending
    ? "Estoque compartilhado ao salvar o grupo"
    : "Estoque compartilhado";
  return (
    <span
      className={styles.indicator}
      role="img"
      aria-label={label}
      title={label}
    >
      <Icon name="stockLink" />
    </span>
  );
}
