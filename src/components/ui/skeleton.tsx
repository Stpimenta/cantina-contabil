import styles from "./skeleton.module.css";

export function Skeleton({
  shape = "text",
}: {
  shape?:
    | "text"
    | "short"
    | "title"
    | "amount"
    | "total"
    | "control"
    | "bar"
    | "count";
}) {
  return (
    <span className={`${styles.root} ${styles[shape]}`} aria-hidden="true" />
  );
}
