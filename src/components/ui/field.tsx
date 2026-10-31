import { FieldError } from "./field-error";
import styles from "./field.module.css";
import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  id,
  label,
  error,
  trailing,
  labelAction,
  hideLabel = false,
  appearance = "standard",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  trailing?: ReactNode;
  labelAction?: ReactNode;
  hideLabel?: boolean;
  appearance?: "standard" | "search";
}) {
  return (
    <div
      className={`${styles.root}${appearance === "search" ? ` ${styles.search}` : ""}`}
    >
      {labelAction ? (
        <div className={styles.labelRow}>
          <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
            {label}
          </label>
          {labelAction}
        </div>
      ) : (
        <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
          {label}
        </label>
      )}
      <div className={styles.control}>
        <input
          {...props}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {trailing}
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}
