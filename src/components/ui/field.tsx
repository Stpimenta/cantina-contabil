import { Icon } from "./icon";
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
  searchWithoutButtonOnMobile = false,
  appearance = "standard",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: ReactNode;
  error?: string;
  trailing?: ReactNode;
  labelAction?: ReactNode;
  hideLabel?: boolean;
  searchWithoutButtonOnMobile?: boolean;
  appearance?: "standard" | "search" | "quantityNative" | "quantityStepper";
}) {
  return (
    <div
      className={`${styles.root}${appearance !== "standard" ? ` ${styles[appearance]}` : ""}${searchWithoutButtonOnMobile ? ` ${styles.searchWithoutButtonOnMobile}` : ""}`}
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
        {searchWithoutButtonOnMobile && appearance === "search" && (
          <span className={styles.mobileSearchIcon} aria-hidden="true">
            <Icon name="search" />
          </span>
        )}
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
