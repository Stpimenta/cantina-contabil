import { Skeleton } from "@/components/ui/skeleton";
import styles from "./order-list.module.css";

export function OrderListLoading() {
  return (
    <ul className="record-list" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <li key={item} className={`record-row ${styles.row}`}>
          <div className={styles.customerName}>
            <Skeleton />
          </div>
          <div className={`stack-small ${styles.content}`}>
            <Skeleton shape="short" />
            <Skeleton />
            <Skeleton shape="short" />
          </div>
          <div className={`action-group ${styles.actions}`}>
            <Skeleton shape="control" />
            <Skeleton shape="control" />
            <Skeleton shape="control" />
          </div>
        </li>
      ))}
    </ul>
  );
}
