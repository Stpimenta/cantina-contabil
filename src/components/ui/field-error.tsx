import styles from "./field.module.css";

export function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className={styles.error}>
      {error}
    </p>
  ) : null;
}
